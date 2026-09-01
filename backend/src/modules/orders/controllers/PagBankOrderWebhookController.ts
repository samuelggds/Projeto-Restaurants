import { Request, Response } from 'express';
import { load } from 'cheerio';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import finalizeOrderCardPaymentService from '../services/FinalizeOrderCardPaymentService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';

const APPROVED_TRANSACTION_STATUSES = new Set(['3', '4']);
const TERMINAL_TRANSACTION_STATUSES = new Set(['6', '7', '8']);
const TERMINAL_ORDER_STATUSES = new Set(['CANCELED', 'CANCELLED', 'DECLINED', 'EXPIRED']);

type PagBankTransactionDetails = {
  code: string;
  status: string;
  reference: string;
  grossAmount: string;
  paymentMethodType: string;
};

type PagBankCredentials = {
  email: string;
  token: string;
  environment: 'production';
};

type PagBankOrderChargeDetails = {
  id: string;
  status: string;
  reference: string;
  amount: unknown;
  currency: unknown;
  paymentMethodType: string;
};

type PagBankOrderDetails = {
  id: string;
  reference: string;
  charges: PagBankOrderChargeDetails[];
};

class PagBankWebhookError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeEnvironment(): 'production' {
  // Webhook PagBank opera somente em producao.
  return 'production';
}

async function getPagBankCredentials(restaurantId?: number): Promise<PagBankCredentials> {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  if (!restaurantId && !allowGlobalFallback) {
    throw new PagBankWebhookError(
      'Webhook PagBank sem restaurantId. Configure notificationURL com restaurantId.',
      400,
    );
  }

  const settings = restaurantId
    ? await restaurantSettingsRepository.findByRestaurantId(restaurantId)
    : null;
  const settingsEmail = String(settings?.pagbankEmail || '').trim();
  const settingsToken = String(settings?.pagbankToken || '').trim();
  const globalEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || '').trim();
  const globalToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || '').trim();
  const email = settingsEmail || (allowGlobalFallback ? globalEmail : '');
  const token = settingsToken || (allowGlobalFallback ? globalToken : '');
  const environment = normalizeEnvironment();

  if (!email || !token) {
    throw new PagBankWebhookError(
      'Webhook PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante.',
      503,
    );
  }

  return { email, token, environment };
}

function resolvePagBankApiBaseUrl(environment: 'production') {
  void environment;
  return 'https://ws.pagseguro.uol.com.br';
}

function resolvePagBankOrdersApiBaseUrl() {
  return String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com')
    .trim()
    .replace(/\/+$/, '');
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function parsePagBankOrderDetails(value: unknown): PagBankOrderDetails {
  const order = asRecord(value);
  const charges = Array.isArray(order.charges) ? order.charges : [];

  return {
    id: String(order.id || '').trim(),
    reference: String(order.reference_id || '').trim(),
    charges: charges.map((rawCharge) => {
      const charge = asRecord(rawCharge);
      const amount = asRecord(charge.amount);
      const paymentMethod = asRecord(charge.payment_method);

      return {
        id: String(charge.id || '').trim(),
        status: String(charge.status || '')
          .trim()
          .toUpperCase(),
        reference: String(charge.reference_id || '').trim(),
        amount: amount.value,
        currency: amount.currency,
        paymentMethodType: String(paymentMethod.type || '')
          .trim()
          .toUpperCase(),
      };
    }),
  };
}

async function fetchPagBankOrderById(pagBankOrderId: string, restaurantId: number) {
  const { token } = await getPagBankCredentials(restaurantId);
  const response = await fetch(
    `${resolvePagBankOrdersApiBaseUrl()}/orders/${encodeURIComponent(pagBankOrderId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  );
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new PagBankWebhookError('PagBank webhook: falha ao consultar pedido.', 502);
  }

  return parsePagBankOrderDetails(responseBody);
}

function extractXmlTagValue(xml: string, tag: string) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
  const match = regex.exec(String(xml || ''));

  return String(match?.[1] || '').trim();
}

function parsePagBankTransactionDetails(xml: string): PagBankTransactionDetails {
  const parsedXml = load(String(xml || ''), { xmlMode: true });
  const transaction = parsedXml('transaction').first();

  return {
    code: transaction.children('code').first().text().trim(),
    status: transaction.children('status').first().text().trim(),
    reference: transaction.children('reference').first().text().trim(),
    grossAmount: transaction.children('grossAmount').first().text().trim(),
    paymentMethodType: transaction.children('paymentMethod').children('type').first().text().trim(),
  };
}

async function fetchPagBankTransactionByNotificationCode(
  notificationCode: string,
  restaurantId?: number,
) {
  const { email, token, environment } = await getPagBankCredentials(restaurantId);
  const url = `${resolvePagBankApiBaseUrl(environment)}/v3/transactions/notifications/${encodeURIComponent(notificationCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'GET',
  });
  const responseText = await response.text();

  if (!response.ok) {
    const providerMessage =
      extractXmlTagValue(responseText, 'message') ||
      extractXmlTagValue(responseText, 'error') ||
      'Falha ao consultar notificacao no PagBank.';
    throw new PagBankWebhookError(`PagBank webhook: ${providerMessage}`, 502);
  }

  return parsePagBankTransactionDetails(responseText);
}

async function fetchPagBankTransactionByCode(transactionCode: string, restaurantId?: number) {
  const { email, token, environment } = await getPagBankCredentials(restaurantId);
  const url = `${resolvePagBankApiBaseUrl(environment)}/v3/transactions/${encodeURIComponent(transactionCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  const response = await fetch(url, {
    method: 'GET',
  });
  const responseText = await response.text();

  if (!response.ok) {
    const providerMessage =
      extractXmlTagValue(responseText, 'message') ||
      extractXmlTagValue(responseText, 'error') ||
      'Falha ao consultar transacao no PagBank.';
    throw new PagBankWebhookError(`PagBank webhook: ${providerMessage}`, 502);
  }

  return parsePagBankTransactionDetails(responseText);
}

class PagBankOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const notificationCode = String(
        req.body?.notificationCode || req.query?.notificationCode || '',
      ).trim();
      const transactionCode = String(
        req.body?.transactionCode ||
          req.body?.code ||
          req.query?.transactionCode ||
          req.query?.code ||
          '',
      ).trim();
      const restaurantIdHint =
        Number(req.body?.restaurantId || req.query?.restaurantId || 0) || undefined;

      // A API Orders usada pelo Pix envia o próprio pedido PagBank no webhook,
      // enquanto o checkout clássico envia notificationCode/transactionCode.
      const pagBankOrderId = String(req.body?.id || req.body?.order?.id || '').trim();
      const referenceId = String(
        req.body?.reference_id || req.body?.order?.reference_id || '',
      ).trim();
      const chargeStatuses = [
        ...(Array.isArray(req.body?.charges) ? req.body.charges : []),
        ...(Array.isArray(req.body?.order?.charges) ? req.body.order.charges : []),
      ].map((charge: { status?: unknown }) => String(charge?.status || '').toUpperCase());

      const pixReference = /^orderpix:(\d+):(\d+)$/i.exec(referenceId);
      if (pagBankOrderId && pixReference) {
        const referenceRestaurantId = Number(pixReference[1]);
        const referenceOrderId = Number(pixReference[2]);
        if (restaurantIdHint && restaurantIdHint !== referenceRestaurantId) {
          return res.status(400).json({
            error: 'Webhook PagBank rejeitado: restaurante da transação não confere.',
          });
        }

        const paymentId = `pagbank:${pagBankOrderId}`;
        const providerStatus = await orderPixPaymentService.getPaymentStatus({
          paymentId,
          restaurantId: referenceRestaurantId,
        });
        const normalizedProviderStatus = String(providerStatus.status || '').toUpperCase();

        if (providerStatus.isApproved || chargeStatuses.includes('PAID')) {
          await finalizeOrderPixPaymentService.execute({
            orderId: referenceOrderId,
            paymentId,
            restaurantId: referenceRestaurantId,
            allowMissingOrder: true,
          });
        } else if (TERMINAL_ORDER_STATUSES.has(normalizedProviderStatus)) {
          await failPendingOrderPaymentService.execute({
            orderId: referenceOrderId,
            restaurantId: referenceRestaurantId,
          });
        }
        return res.sendStatus(200);
      }

      const cardOrderReference = /^ordercard:(\d+):(\d+)$/i.exec(referenceId);
      if (pagBankOrderId && cardOrderReference) {
        const referenceOrderId = Number(cardOrderReference[1]);
        const referenceRestaurantId = Number(cardOrderReference[2]);
        if (
          !Number.isInteger(referenceOrderId) ||
          referenceOrderId <= 0 ||
          !Number.isInteger(referenceRestaurantId) ||
          referenceRestaurantId <= 0 ||
          (restaurantIdHint && restaurantIdHint !== referenceRestaurantId)
        ) {
          return res.status(400).json({
            error: 'Webhook PagBank rejeitado: restaurante da transação não confere.',
          });
        }

        const order = await orderRepository.findById(referenceOrderId, referenceRestaurantId);
        if (!order) {
          return res.sendStatus(200);
        }

        const expectedReference = `ordercard:${referenceOrderId}:${referenceRestaurantId}`;
        const providerOrder = await fetchPagBankOrderById(pagBankOrderId, referenceRestaurantId);
        const linkedPaymentId = String(order.cardCheckoutSessionId || '').trim();
        const providerCharge = providerOrder.charges.find((charge) =>
          linkedPaymentId
            ? `pagbank_tx:${charge.id}` === linkedPaymentId
            : charge.reference === expectedReference,
        );

        if (
          providerOrder.id !== pagBankOrderId ||
          providerOrder.reference !== expectedReference ||
          String(order.paymentMethod || '').toUpperCase() !== 'CARTAO' ||
          !providerCharge ||
          providerCharge.reference !== expectedReference
        ) {
          return res.status(400).json({
            error: 'Webhook PagBank rejeitado: identificação da transação não confere.',
          });
        }

        if (TERMINAL_ORDER_STATUSES.has(providerCharge.status)) {
          await failPendingOrderPaymentService.execute({
            orderId: referenceOrderId,
            restaurantId: referenceRestaurantId,
          });
          return res.sendStatus(200);
        }

        if (providerCharge.status !== 'PAID') {
          return res.sendStatus(200);
        }

        if (
          providerCharge.paymentMethodType !== 'CREDIT_CARD' ||
          !matchesOrderPaymentEvidence({
            expectedAmount: order.total,
            providerAmount: providerCharge.amount,
            providerAmountUnit: 'MINOR',
            providerCurrency: providerCharge.currency,
          })
        ) {
          return res.status(400).json({
            error: 'Webhook PagBank rejeitado: dados financeiros da transação não conferem.',
          });
        }

        const providerPaymentId = `pagbank_tx:${providerCharge.id}`;
        await orderRepository.setCardCheckoutSessionId(
          referenceOrderId,
          referenceRestaurantId,
          providerPaymentId,
        );
        await finalizeOrderCardPaymentService.execute({
          orderId: referenceOrderId,
          checkoutSessionId: providerPaymentId,
          restaurantId: referenceRestaurantId,
          allowMissingOrder: true,
        });
        return res.sendStatus(200);
      }

      if (!restaurantIdHint && process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK !== 'true') {
        return res.status(400).json({
          error: 'restaurantId obrigatorio no webhook PagBank para ambiente multi-tenant.',
        });
      }

      if (!notificationCode && !transactionCode) {
        return res.sendStatus(200);
      }

      const details = notificationCode
        ? await fetchPagBankTransactionByNotificationCode(notificationCode, restaurantIdHint)
        : await fetchPagBankTransactionByCode(transactionCode, restaurantIdHint);

      const externalReference = String(details.reference || '').trim();
      const cardReference = /^ordercard:(\d+):(\d+)$/i.exec(externalReference);

      if (cardReference && restaurantIdHint && Number(cardReference[2]) !== restaurantIdHint) {
        return res.status(400).json({
          error: 'Webhook PagBank rejeitado: restaurante da transação não confere.',
        });
      }

      if (TERMINAL_TRANSACTION_STATUSES.has(String(details.status || '')) && cardReference) {
        await failPendingOrderPaymentService.execute({
          orderId: Number(cardReference[1]),
          restaurantId: Number(cardReference[2]),
        });
        return res.sendStatus(200);
      }

      if (!APPROVED_TRANSACTION_STATUSES.has(String(details.status || ''))) {
        return res.sendStatus(200);
      }

      if (externalReference.startsWith('ordercard:')) {
        const [, orderId = '', restaurantId = ''] = externalReference.split(':');
        const referenceRestaurantId = Number(restaurantId || 0);

        if (
          !Number.isInteger(referenceRestaurantId) ||
          referenceRestaurantId <= 0 ||
          (restaurantIdHint && referenceRestaurantId !== restaurantIdHint)
        ) {
          return res.status(400).json({
            error: 'Webhook PagBank rejeitado: restaurante da transação não confere.',
          });
        }

        if (orderId) {
          const order = await orderRepository.findById(orderId, referenceRestaurantId);
          if (!order) {
            return res.sendStatus(200);
          }
          if (
            String(order.paymentMethod || '').toUpperCase() !== 'CARTAO' ||
            details.paymentMethodType !== '3' ||
            !matchesOrderPaymentEvidence({
              expectedAmount: order.total,
              providerAmount: details.grossAmount,
              providerCurrency: 'BRL',
            })
          ) {
            return res.status(400).json({
              error: 'Webhook PagBank rejeitado: dados financeiros da transação não conferem.',
            });
          }

          if (details.code) {
            await orderRepository.setCardCheckoutSessionId(
              orderId,
              referenceRestaurantId,
              `pagbank_tx:${details.code}`,
            );
          }

          await finalizeOrderCardPaymentService.execute({
            orderId,
            restaurantId: referenceRestaurantId,
            allowMissingOrder: true,
          });
        }
      }

      return res.sendStatus(200);
    } catch (error: unknown) {
      const statusCode = error instanceof PagBankWebhookError ? error.statusCode : 500;
      const message =
        error instanceof PagBankWebhookError ? error.message : 'Erro interno no webhook PagBank.';

      console.error('[ORDER_CARD_PAGBANK_WEBHOOK_ERROR]', {
        statusCode,
        errorType: safeErrorName(error),
      });

      return res.status(statusCode).json({ error: message });
    }
  }
}

export default new PagBankOrderWebhookController();
