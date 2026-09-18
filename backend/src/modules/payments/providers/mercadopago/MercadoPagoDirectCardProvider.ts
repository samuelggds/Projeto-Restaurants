import { normalizeMercadoPagoPaymentMethodId } from '../../../customerPaymentMethods/domain/cardBrand.js';
import { mercadoPagoCardExternalReference } from '../../../orders/domain/mercadoPagoCardReference.js';
import { getMercadoPagoAccessToken } from '../../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import type {
  DirectCardPaymentOrder,
  DirectCardPaymentProvider,
  DirectCardPaymentRequest,
} from '../../domain/DirectCardPaymentProvider.js';
import {
  CardPaymentDeclinedError,
  CardPaymentProviderRequestError,
  PaymentSplitConfigurationError,
} from '../../domain/paymentErrors.js';
import {
  amount,
  internalReturnUrl,
  payerEmail,
  providerErrorCode,
  providerErrorItems,
  readResponse,
  safeProviderMessage,
  savedMethod,
  splitConfigurationError,
} from '../cardProviderSupport.js';
import { CARD_PROVIDERS } from '../providerCatalog.js';

export function mercadoPagoDeclineDetails(body: Record<string, unknown>) {
  const data =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;
  const transactions =
    data.transactions && typeof data.transactions === 'object'
      ? (data.transactions as Record<string, unknown>)
      : null;
  const payments = Array.isArray(transactions?.payments) ? transactions.payments : [];
  const payment =
    payments[0] && typeof payments[0] === 'object'
      ? (payments[0] as Record<string, unknown>)
      : null;

  const errors = providerErrorItems(body);
  const firstError =
    errors[0] && typeof errors[0] === 'object'
      ? (errors[0] as Record<string, unknown>)
      : null;
  const errorDetails = Array.isArray(firstError?.details) ? firstError.details : [];
  const firstDetail =
    errorDetails[0] && typeof errorDetails[0] === 'object'
      ? (errorDetails[0] as Record<string, unknown>)
      : null;

  const status = String(payment?.status || firstDetail?.status || '').trim().slice(0, 80);
  const statusDetail = String(
    payment?.status_detail ||
      payment?.statusDetail ||
      firstDetail?.status_detail ||
      firstDetail?.statusDetail ||
      firstDetail?.code ||
      '',
  )
    .trim()
    .slice(0, 160);

  return {
    transactionStatus: status || null,
    transactionStatusDetail: statusDetail || null,
  };
}

function isMercadoPagoRequestValidationError(status: number, body: Record<string, unknown>) {
  if (status !== 400) return false;
  return new Set([
    'property_value',
    'property_type',
    'required_properties',
    'unsupported_properties',
    'invalid_properties',
    'invalid_total_amount',
    'json_syntax_error',
    'minimum_properties',
    'minimum_items',
    'maximum_items',
    'invalid_order_type',
  ]).has(providerErrorCode(body));
}

export class MercadoPagoDirectCardProvider implements DirectCardPaymentProvider {
  readonly code = CARD_PROVIDERS.MERCADO_PAGO;

  async create(
    payload: DirectCardPaymentRequest,
    order: DirectCardPaymentOrder,
    successUrlBase: string,
  ) {
    const token = String(payload.cardToken || '').trim();
    if (!token) throw new CardPaymentDeclinedError('Informe os dados do cartão para continuar.');

    const stored = await savedMethod(payload, order, this.code);
    if (payload.paymentMethodId && !stored) {
      throw new CardPaymentDeclinedError('O cartão salvo selecionado não foi encontrado.');
    }

    const tokenPaymentMethodId = normalizeMercadoPagoPaymentMethodId(payload.cardPaymentMethodId);
    const storedPaymentMethodId = normalizeMercadoPagoPaymentMethodId(stored?.brand);
    if (
      stored &&
      tokenPaymentMethodId &&
      storedPaymentMethodId &&
      tokenPaymentMethodId !== storedPaymentMethodId
    ) {
      throw new CardPaymentDeclinedError(
        'O cartão validado não corresponde à bandeira do cartão salvo.',
      );
    }
    const paymentMethodId = tokenPaymentMethodId || storedPaymentMethodId;
    if (!paymentMethodId) {
      throw new CardPaymentDeclinedError('Não foi possível identificar a bandeira do cartão.');
    }

    const accessToken = await getMercadoPagoAccessToken(order.restaurantId);
    const total = amount(order.total);
    const marketplaceFee = Number(order.systemFee || 0);
    const reference = mercadoPagoCardExternalReference(order.id, order.restaurantId);
    const email = await payerEmail(payload, order);

    const body = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: total.toFixed(2),
      external_reference: reference,
      description: `Pedido #${order.id}`,
      ...(marketplaceFee > 0 ? { marketplace_fee: marketplaceFee.toFixed(2) } : {}),
      payer: { email },
      transactions: {
        payments: [
          {
            amount: total.toFixed(2),
            payment_method: {
              id: paymentMethodId,
              type: 'credit_card',
              token,
              installments: 1,
            },
          },
        ],
      },
    };

    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `order-card-${order.restaurantId}-${order.id}`,
      },
      body: JSON.stringify(body),
    });
    const result = await readResponse(response);

    if (!response.ok && marketplaceFee > 0 && splitConfigurationError(safeProviderMessage(result, ''))) {
      throw new PaymentSplitConfigurationError(
        'O Mercado Pago rejeitou a divisão da taxa da plataforma. Revise a configuração Marketplace antes de receber este pagamento.',
      );
    }

    if (!response.ok) {
      if (isMercadoPagoRequestValidationError(response.status, result)) {
        const providerCode = providerErrorCode(result) || 'invalid_request';
        const providerMessage = safeProviderMessage(
          result,
          'O Mercado Pago rejeitou os dados enviados pelo checkout.',
        );
        console.error('[MERCADO_PAGO_CARD_REQUEST_INVALID]', {
          orderId: order.id,
          restaurantId: order.restaurantId,
          providerStatus: response.status,
          providerCode,
          providerMessage,
        });
        throw new CardPaymentProviderRequestError(
          'Não foi possível processar o cartão neste momento.',
          response.status,
          providerCode,
        );
      }

      if (response.status === 402) {
        const decline = mercadoPagoDeclineDetails(result);
        console.warn('[MERCADO_PAGO_CARD_DECLINED]', {
          orderId: order.id,
          restaurantId: order.restaurantId,
          providerStatus: response.status,
          providerCode: providerErrorCode(result) || 'card_declined',
          transactionStatus: decline.transactionStatus,
          transactionStatusDetail: decline.transactionStatusDetail,
        });
        throw new CardPaymentDeclinedError(
          safeProviderMessage(result, 'O Mercado Pago não autorizou este cartão.'),
        );
      }

      if (response.status >= 400 && response.status < 500) {
        throw new CardPaymentProviderRequestError(
          'Não foi possível processar o cartão neste momento.',
          response.status,
          providerErrorCode(result) || 'provider_request_error',
        );
      }
      throw new Error('Falha temporária ao processar o cartão no Mercado Pago.');
    }

    const providerOrderId = String(result.id || '').trim();
    const status = String(result.status || '').trim().toLowerCase();
    if (!providerOrderId) {
      throw new Error('Mercado Pago não retornou a identificação da cobrança.');
    }
    const approved = status === 'processed';

    return {
      provider: this.code,
      sessionId: providerOrderId,
      persistenceSessionId: `mp_order:${providerOrderId}`,
      checkoutUrl: internalReturnUrl(successUrlBase, order, approved ? 'success' : 'pending'),
      paymentApproved: approved,
    };
  }
}

export default new MercadoPagoDirectCardProvider();
