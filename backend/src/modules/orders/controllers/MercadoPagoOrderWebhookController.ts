import { Request, Response } from 'express';
import prisma from '../../../config/prisma.js';
import { authenticateMercadoPagoWebhook } from '../../payments/providers/mercadoPagoWebhookSignature.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import finalizeOrderCardPaymentService from '../services/FinalizeOrderCardPaymentService.js';
import {
  getMercadoPagoOrderApi,
  getMercadoPagoPaymentApi,
} from '../../payments/providers/mercadoPagoClient.js';
import orderRepository from '../repositories/OrderRepository.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';
import { parseMercadoPagoCardExternalReference } from '../domain/mercadoPagoCardReference.js';

const APPROVED_STATUSES = new Set(['approved', 'accredited', 'paid']);
const TERMINAL_UNPAID_STATUSES = new Set(['cancelled', 'rejected', 'refunded', 'charged_back']);
const TERMINAL_ORDER_STATUSES = new Set(['cancelled', 'expired', 'failed', 'refunded']);

export function parseMercadoPagoOrderReference(externalReference: string) {
  const normalized = String(externalReference || '').trim();

  const cardReference = parseMercadoPagoCardExternalReference(normalized);
  if (cardReference) {
    return {
      type: 'card' as const,
      restaurantId: cardReference.restaurantId,
      orderId: cardReference.orderId,
    };
  }

  const pixMatch = /^orderpix:(\d+):(\d+)$/i.exec(normalized);
  if (!pixMatch) return null;

  return {
    type: 'pix' as const,
    restaurantId: Number(pixMatch[1] || 0),
    orderId: Number(pixMatch[2] || 0),
  };
}

function isMercadoPagoOrderEvent(req: Request, resourceId: string) {
  const eventType = String(req.body?.type || req.body?.topic || '').trim().toLowerCase();
  return eventType === 'order' || /^ord[a-z0-9_-]+$/i.test(resourceId);
}

async function findOrderByMercadoPagoOrderId(providerOrderId: string) {
  return prisma.order.findFirst({
    where: {
      cardCheckoutSessionId: {
        in: [`mp_pref:${providerOrderId}`, `mp_order:${providerOrderId}`],
      },
    },
    select: {
      id: true,
      restaurantId: true,
      total: true,
      paymentMethod: true,
      cardCheckoutSessionId: true,
    },
  });
}

async function handleOrdersApiWebhook(providerOrderId: string, res: Response) {
  const localOrder = await findOrderByMercadoPagoOrderId(providerOrderId);
  if (!localOrder) {
    // Não revelar existência de outros tenants nem provocar retries infinitos para
    // orders que não pertencem a esta instalação.
    return res.sendStatus(200);
  }

  const orderApi = await getMercadoPagoOrderApi(localOrder.restaurantId);
  const remoteOrder = await orderApi.get(providerOrderId);
  const status = String(remoteOrder.status || '').trim().toLowerCase();
  const externalReference = String(remoteOrder.external_reference || '').trim();
  const parsedReference = parseMercadoPagoOrderReference(externalReference);

  if (
    !parsedReference ||
    parsedReference.type !== 'card' ||
    parsedReference.orderId !== localOrder.id ||
    parsedReference.restaurantId !== localOrder.restaurantId
  ) {
    return res.status(400).json({
      error: 'Webhook Mercado Pago rejeitado: referência da order não confere.',
    });
  }

  if (TERMINAL_ORDER_STATUSES.has(status)) {
    await failPendingOrderPaymentService.execute({
      orderId: localOrder.id,
      restaurantId: localOrder.restaurantId,
    });
    return res.sendStatus(200);
  }

  if (status !== 'processed') {
    return res.sendStatus(200);
  }

  if (
    String(localOrder.paymentMethod || '').toUpperCase() !== 'CARTAO' ||
    !matchesOrderPaymentEvidence({
      expectedAmount: localOrder.total,
      providerAmount: remoteOrder.total_paid_amount ?? remoteOrder.total_amount,
      providerCurrency: remoteOrder.currency,
    })
  ) {
    return res.status(400).json({
      error: 'Webhook Mercado Pago rejeitado: dados financeiros da order não conferem.',
    });
  }

  const providerSessionId = `mp_order:${providerOrderId}`;
  await orderRepository.setCardCheckoutSessionId(
    localOrder.id,
    localOrder.restaurantId,
    providerSessionId,
  );
  await finalizeOrderCardPaymentService.execute({
    orderId: localOrder.id,
    checkoutSessionId: providerSessionId,
    restaurantId: localOrder.restaurantId,
    allowMissingOrder: true,
  });

  return res.sendStatus(200);
}

class MercadoPagoOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const paymentId = authenticateMercadoPagoWebhook(req, res);
      if (!paymentId) return res;

      if (isMercadoPagoOrderEvent(req, paymentId)) {
        return handleOrdersApiWebhook(paymentId, res);
      }

      const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
      const hintedRestaurantId = Number(req.query?.restaurantId || req.body?.restaurantId || 0);

      if (
        (!Number.isInteger(hintedRestaurantId) || hintedRestaurantId <= 0) &&
        !allowGlobalFallback
      ) {
        return res.status(400).json({
          error: 'restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant.',
        });
      }

      const paymentApi = await getMercadoPagoPaymentApi(
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
          ? hintedRestaurantId
          : undefined,
      );
      const response = (await paymentApi.get({
        id: String(paymentId),
      })) as unknown;
      const payment =
        typeof response === 'object' && response !== null
          ? ((response as { body?: unknown }).body ?? response)
          : {};

      const status = String((payment as { status?: unknown }).status || '').toLowerCase();
      const transactionAmount = (payment as { transaction_amount?: unknown }).transaction_amount;
      const currency = (payment as { currency_id?: unknown }).currency_id;
      const externalReference = String(
        (payment as { external_reference?: unknown }).external_reference || '',
      ).trim();
      const metadataRestaurantId = Number(
        (payment as { metadata?: { restaurant_id?: unknown } }).metadata?.restaurant_id || 0,
      );
      const resolvedRestaurantId =
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
          ? hintedRestaurantId
          : Number.isInteger(metadataRestaurantId) && metadataRestaurantId > 0
            ? metadataRestaurantId
            : undefined;
      const parsedReference = parseMercadoPagoOrderReference(externalReference);
      const referenceType = parsedReference?.type || '';
      const referenceRestaurantId = parsedReference?.restaurantId || 0;
      const referenceOrderId = parsedReference?.orderId || 0;

      if (
        parsedReference &&
        ((hintedRestaurantId > 0 && referenceRestaurantId !== hintedRestaurantId) ||
          (metadataRestaurantId > 0 && referenceRestaurantId !== metadataRestaurantId))
      ) {
        return res.status(400).json({
          error: 'Webhook Mercado Pago rejeitado: restaurante da transação não confere.',
        });
      }

      if (TERMINAL_UNPAID_STATUSES.has(status)) {
        if (parsedReference) {
          await failPendingOrderPaymentService.execute({
            orderId: referenceOrderId,
            restaurantId: referenceRestaurantId,
          });
        } else {
          await failPendingOrderPaymentService.execute({
            restaurantId: resolvedRestaurantId,
            pixPaymentId: String(paymentId),
          });
        }
        return res.sendStatus(200);
      }

      if (!APPROVED_STATUSES.has(status)) {
        return res.sendStatus(200);
      }

      if (referenceType === 'card') {
        const orderId = referenceOrderId;
        const normalizedPaymentId = String(paymentId || '').trim();

        if (
          !Number.isInteger(orderId) ||
          orderId <= 0 ||
          !Number.isInteger(referenceRestaurantId) ||
          referenceRestaurantId <= 0
        ) {
          return res.status(400).json({
            error: 'Webhook Mercado Pago rejeitado: restaurante da transação não confere.',
          });
        }

        const order = await orderRepository.findById(orderId, referenceRestaurantId);
        if (!order) {
          return res.sendStatus(200);
        }
        const providerPaymentId = `mp_pay:${normalizedPaymentId}`;
        const linkedPaymentId = String(order.cardCheckoutSessionId || '').trim();
        const canBindPaymentId =
          !linkedPaymentId ||
          linkedPaymentId.startsWith('mp_pref:') ||
          linkedPaymentId === providerPaymentId;
        if (!canBindPaymentId) {
          return res.status(400).json({
            error: 'Webhook Mercado Pago rejeitado: identificação da transação não confere.',
          });
        }
        if (
          String(order.paymentMethod || '').toUpperCase() !== 'CARTAO' ||
          !matchesOrderPaymentEvidence({
            expectedAmount: order.total,
            providerAmount: transactionAmount,
            providerCurrency: currency,
          })
        ) {
          return res.status(400).json({
            error: 'Webhook Mercado Pago rejeitado: dados financeiros da transação não conferem.',
          });
        }

        if (normalizedPaymentId) {
          await orderRepository.setCardCheckoutSessionId(
            orderId,
            referenceRestaurantId,
            providerPaymentId,
          );
        }

        await finalizeOrderCardPaymentService.execute({
          orderId,
          checkoutSessionId: providerPaymentId,
          restaurantId: referenceRestaurantId,
          allowMissingOrder: true,
        });

        return res.sendStatus(200);
      }

      await finalizeOrderPixPaymentService.execute({
        orderId: referenceType === 'pix' ? referenceOrderId : undefined,
        paymentId: String(paymentId),
        restaurantId: referenceType === 'pix' ? referenceRestaurantId : resolvedRestaurantId,
        allowMissingOrder: true,
      });

      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error('[ORDER_PAYMENT_WEBHOOK_ERROR]', { errorType: safeErrorName(error) });

      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoOrderWebhookController();
