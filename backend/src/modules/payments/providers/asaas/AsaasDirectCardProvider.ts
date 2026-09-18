import { matchesOrderPaymentEvidence } from '../../../orders/utils/paymentEvidence.js';
import restaurantSettingsRepository from '../../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import type {
  DirectCardPaymentOrder,
  DirectCardPaymentProvider,
  DirectCardPaymentRequest,
} from '../../domain/DirectCardPaymentProvider.js';
import {
  CardPaymentDeclinedError,
  PaymentSplitConfigurationError,
} from '../../domain/paymentErrors.js';
import {
  amount,
  digits,
  internalReturnUrl,
  payerEmail,
  readResponse,
  safeProviderMessage,
  splitConfigurationError,
} from '../cardProviderSupport.js';
import { CARD_PROVIDERS } from '../providerCatalog.js';

async function asaasJson(url: string, accessToken: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(65_000),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      access_token: accessToken,
    },
    body: JSON.stringify(body),
  });
  return { response, body: await readResponse(response) };
}

export class AsaasDirectCardProvider implements DirectCardPaymentProvider {
  readonly code = CARD_PROVIDERS.ASAAS;

  async create(
    payload: DirectCardPaymentRequest,
    order: DirectCardPaymentOrder,
    successUrlBase: string,
  ) {
    const number = digits(payload.cardData?.number);
    const securityCode = digits(payload.cardData?.securityCode);
    const expMonth = Number(payload.expMonth || 0);
    const expYear = Number(payload.expYear || 0);
    const holderName = String(payload.holderName || payload.customerName || '').trim();
    const taxId = digits(payload.holderTaxId);

    if (
      number.length < 13 ||
      number.length > 19 ||
      securityCode.length < 3 ||
      securityCode.length > 4 ||
      !Number.isInteger(expMonth) ||
      expMonth < 1 ||
      expMonth > 12 ||
      !Number.isInteger(expYear) ||
      expYear < new Date().getFullYear() ||
      holderName.length < 2 ||
      ![11, 14].includes(taxId.length)
    ) {
      throw new CardPaymentDeclinedError('Revise os dados do cartão e do titular.');
    }

    const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const accessToken = String(
      settings?.asaasAccessToken || (allowGlobalFallback ? process.env.ASAAS_API_KEY : '') || '',
    ).trim();
    if (!accessToken) {
      throw new Error('Pagamento com cartão indisponível no momento.');
    }

    const baseUrl = String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
      .trim()
      .replace(/\/+$/, '');
    const email = await payerEmail(payload, order);
    const phone = digits(payload.customerPhone);
    const postalCode = digits(payload.billingPostalCode || payload.zipCode);
    const addressNumber = String(payload.billingAddressNumber || payload.number || '').trim();

    const customerResult = await asaasJson(`${baseUrl}/v3/customers`, accessToken, {
      name: String(payload.customerName || holderName).trim(),
      email,
      cpfCnpj: taxId,
      ...(phone ? { mobilePhone: phone } : {}),
    });

    if (!customerResult.response.ok) {
      if (customerResult.response.status >= 400 && customerResult.response.status < 500) {
        throw new CardPaymentDeclinedError(
          safeProviderMessage(customerResult.body, 'Não foi possível validar o titular do cartão.'),
        );
      }
      throw new Error('Falha temporária ao validar o titular no Asaas.');
    }

    const customerId = String(customerResult.body.id || '').trim();
    if (!customerId) {
      throw new Error('Asaas não retornou a identificação do cliente.');
    }

    const systemFee = Number(order.systemFee || 0);
    const walletId = String(settings?.gatewayMerchantId || '').trim();
    const platformWalletId = String(process.env.ASAAS_PLATFORM_WALLET_ID || '').trim();
    if (systemFee > 0 && !platformWalletId) {
      throw new PaymentSplitConfigurationError(
        'A carteira da plataforma Asaas não está configurada. O pagamento foi bloqueado para evitar cobrança sem split.',
      );
    }

    const paymentBody = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: amount(order.total),
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Pedido #${order.id}`,
      externalReference: `ordercard:${order.id}:${order.restaurantId}`,
      creditCard: {
        holderName,
        number,
        expiryMonth: String(expMonth).padStart(2, '0'),
        expiryYear: String(expYear),
        ccv: securityCode,
      },
      creditCardHolderInfo: {
        name: holderName,
        email,
        cpfCnpj: taxId,
        ...(postalCode ? { postalCode } : {}),
        ...(addressNumber ? { addressNumber } : {}),
        ...(payload.complement ? { addressComplement: String(payload.complement) } : {}),
        ...(phone ? { mobilePhone: phone } : {}),
      },
      remoteIp: String(payload.customerIp || '').trim(),
      ...(systemFee > 0
        ? {
            split: [
              { walletId: platformWalletId, fixedValue: systemFee },
              ...(walletId ? [{ walletId, remainingValue: true }] : []),
            ],
          }
        : {}),
    };

    const paymentResult = await asaasJson(
      `${baseUrl}/v3/payments`,
      accessToken,
      paymentBody,
    );

    if (
      !paymentResult.response.ok &&
      systemFee > 0 &&
      splitConfigurationError(safeProviderMessage(paymentResult.body, ''))
    ) {
      throw new PaymentSplitConfigurationError(
        'O Asaas rejeitou a divisão da taxa da plataforma. Revise a configuração de split antes de receber este pagamento.',
      );
    }

    if (!paymentResult.response.ok) {
      if (paymentResult.response.status >= 400 && paymentResult.response.status < 500) {
        throw new CardPaymentDeclinedError(
          safeProviderMessage(paymentResult.body, 'O Asaas não autorizou este cartão.'),
        );
      }
      throw new Error('Falha temporária ao processar o cartão no Asaas.');
    }

    const paymentId = String(paymentResult.body.id || '').trim();
    const status = String(paymentResult.body.status || '').trim().toUpperCase();
    if (!paymentId) {
      throw new Error('Asaas não retornou a identificação da cobrança.');
    }

    const approved =
      ['CONFIRMED', 'RECEIVED'].includes(status) &&
      String(paymentResult.body.billingType || '').toUpperCase() === 'CREDIT_CARD' &&
      String(paymentResult.body.externalReference || '').trim() ===
        `ordercard:${order.id}:${order.restaurantId}` &&
      matchesOrderPaymentEvidence({
        expectedAmount: order.total,
        providerAmount: paymentResult.body.value,
        providerCurrency: 'BRL',
      });

    return {
      provider: this.code,
      sessionId: paymentId,
      persistenceSessionId: `asaas_pay:${paymentId}`,
      checkoutUrl: internalReturnUrl(successUrlBase, order, approved ? 'success' : 'pending'),
      paymentApproved: approved,
    };
  }
}

export default new AsaasDirectCardProvider();
