import Stripe from 'stripe';
import { PaymentMethod } from '@prisma/client';
import { getMercadoPagoPaymentRefundApi } from '../../payments/providers/mercadoPagoClient.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import { mercadoPagoCardExternalReferenceCandidates } from '../domain/mercadoPagoCardReference.js';

export type RefundableOrder = {
  id: number | string;
  restaurantId?: number | string | null;
  total?: number | string | { toString(): string } | null;
  paymentMethod?: PaymentMethod | string | null;
  paid?: boolean | null;
  pixPaymentId?: string | null;
  cardCheckoutSessionId?: string | null;
};

export type RefundProviderReceipt = {
  provider: 'ASAAS' | 'MERCADO_PAGO' | 'STRIPE';
  externalId: string | null;
};

export type RefundOrderPaymentOptions = {
  idempotencyKey?: string | null;
  verifyExistingRefund?: boolean;
  reconcileOnly?: boolean;
};

export class AutomaticRefundError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_SUPPORTED'
      | 'MISSING_REFERENCE'
      | 'MISSING_CREDENTIALS'
      | 'REFUND_PENDING'
      | 'PROVIDER_FAILURE' = 'PROVIDER_FAILURE',
  ) {
    super(message);
    this.name = 'AutomaticRefundError';
  }
}

type AsaasRefundResponse = {
  id?: string;
  status?: string;
  value?: number;
  externalReference?: string;
  refunds?: Array<{ status?: string; value?: number }>;
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};


class RefundOrderPaymentService {
  // Seam pequeno e substituível nos testes; em produção sempre cria o SDK oficial.
  createStripeClient(secretKey: string) {
    return new Stripe(secretKey);
  }

  private resolveAsaasApiBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
      .trim()
      .replace(/\/+$/, '');
  }

  private async getAsaasAccessToken(restaurantId?: number) {
    if (!restaurantId || !Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new AutomaticRefundError(
        'Não foi possível identificar o restaurante para realizar o estorno. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const restaurantToken = String(settings?.asaasAccessToken || '').trim();
    const globalToken = String(process.env.ASAAS_API_KEY || '').trim();
    const accessToken = restaurantToken || (allowGlobalFallback ? globalToken : '');

    if (!accessToken) {
      throw new AutomaticRefundError(
        'O estorno automático está indisponível porque a credencial Asaas não está configurada para este restaurante. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    return accessToken;
  }

  private async executeAsaasRefund(
    paymentId: string,
    order: RefundableOrder,
    options: RefundOrderPaymentOptions,
  ) {
    const normalizedPaymentId = String(paymentId || '').trim();
    const restaurantId = Number(order.restaurantId || 0);

    if (!normalizedPaymentId) {
      throw new AutomaticRefundError(
        'Este pagamento Asaas não possui uma referência válida para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    const accessToken = await this.getAsaasAccessToken(restaurantId);
    const amount = this.parseAmount(order.total);
    const paymentUrl = `${this.resolveAsaasApiBaseUrl()}/v3/payments/${encodeURIComponent(normalizedPaymentId)}`;
    const pending = () =>
      new AutomaticRefundError(
        'O estorno Asaas aguarda confirmação. O pedido não foi cancelado. Consulte novamente para conciliar, sem gerar outro estorno.',
        'REFUND_PENDING',
      );
    const headers = { Accept: 'application/json', access_token: accessToken };
    const readPayment = async () => {
      const response = await fetch(paymentUrl, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw pending();
      const payment = (await response.json()) as AsaasRefundResponse;
      const expectedReference =
        String(order.paymentMethod).toUpperCase() === 'PIX'
          ? `orderpix:${restaurantId}:${order.id}`
          : `ordercard:${order.id}:${restaurantId}`;
      if (
        !amount ||
        payment.id !== normalizedPaymentId ||
        payment.externalReference !== expectedReference ||
        !Number.isFinite(payment.value) ||
        Math.round(Number(payment.value) * 100) !== Math.round(amount * 100)
      ) {
        throw pending();
      }
      return payment;
    };
    const confirmed = (payment: AsaasRefundResponse) => {
      const refunds = payment.refunds || [];
      const returnedCents = refunds
        .filter((refund) => refund.status === 'DONE')
        .reduce(
          (total, refund) =>
            total +
            (Number.isFinite(refund.value) && Number(refund.value) > 0
              ? Math.round(Number(refund.value) * 100)
              : 0),
          0,
        );
      return amount !== null && returnedCents === Math.round(amount * 100);
    };
    const receipt: RefundProviderReceipt = { provider: 'ASAAS', externalId: normalizedPaymentId };
    try {
      const current = await readPayment();
      if (confirmed(current)) return receipt;
      // An existing attempt, partial refund or uncertain previous submission must be reconciled.
      // Never repeat a non-idempotent refund POST based only on an HTTP status.
      if (
        options.reconcileOnly ||
        options.verifyExistingRefund ||
        current.refunds?.length ||
        !['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(String(current.status))
      )
        throw pending();
      const response = await fetch(`${paymentUrl}/refund`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          value: amount,
          description: `Estorno do pedido #${String(order.id)}`,
        }),
      });
      // The canonical payment contains the final status and refunded amounts, even if POST timed out upstream.
      if (!response.ok) throw pending();
      if (!confirmed(await readPayment())) throw pending();
      return receipt;
    } catch {
      // Ambiguous network responses must retain PROCESSING and cannot authorize a second refund.
      throw pending();
    }
  }

  private parseAmount(value: RefundableOrder['total']) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : undefined;
  }

  private async getMercadoPagoAccessTokenByRestaurant(restaurantId?: number | string | null) {
    if (Number(restaurantId) > 0) return getMercadoPagoAccessToken(Number(restaurantId));
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const normalizedRestaurantId = Number(restaurantId || 0);
    const settings =
      Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
        ? await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId)
        : null;

    const token = String(
      settings?.mercadoPagoAccessToken ||
        (allowGlobalFallback ? process.env.MP_ACCESS_TOKEN : '') ||
        '',
    ).trim();

    if (!token) {
      throw new AutomaticRefundError(
        'O estorno automático está indisponível porque a credencial Mercado Pago não está configurada para este restaurante. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    return token;
  }

  private async executeMercadoPagoRefund(
    paymentId: string,
    restaurantId?: number | string | null,
    idempotencyKey?: string | null,
  ) {
    const normalizedPaymentId = String(paymentId || '').trim();
    if (!normalizedPaymentId) {
      throw new AutomaticRefundError(
        'Este pagamento Mercado Pago não possui uma referência válida para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    const refundApi = await getMercadoPagoPaymentRefundApi(Number(restaurantId || 0) || undefined);
    const response = (await refundApi.total({
      payment_id: normalizedPaymentId,
      ...(idempotencyKey
        ? {
            requestOptions: {
              idempotencyKey,
            },
          }
        : {}),
    })) as unknown;
    const refund =
      typeof response === 'object' && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};

    return {
      provider: 'MERCADO_PAGO',
      externalId: String((refund as { id?: unknown }).id || normalizedPaymentId).trim(),
    } satisfies RefundProviderReceipt;
  }

  private async refundPix(order: RefundableOrder, options: RefundOrderPaymentOptions) {
    const paymentId = String(order.pixPaymentId || '').trim();
    const normalizedPaymentId = paymentId.toLowerCase();

    if (!paymentId) {
      throw new AutomaticRefundError(
        'Este pedido Pix não possui uma referência de pagamento para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    if (normalizedPaymentId.startsWith('manual:')) {
      throw new AutomaticRefundError(
        'Este Pix foi confirmado manualmente e exige devolução manual. O pedido não foi cancelado.',
        'NOT_SUPPORTED',
      );
    }

    if (normalizedPaymentId.startsWith('belvo:')) {
      throw new AutomaticRefundError(
        'O Pix via Open Finance foi liquidado fora do Mercado Pago e não possui devolução automática pela API da Belvo. Faça a devolução pela conta recebedora e concilie o pedido antes de cancelar.',
        'NOT_SUPPORTED',
      );
    }

    if (normalizedPaymentId.startsWith('asaas:')) {
      const asaasPaymentId = paymentId.slice('asaas:'.length).trim();
      return this.executeAsaasRefund(asaasPaymentId, order, options);
    }


    return this.executeMercadoPagoRefund(paymentId, order.restaurantId, options.idempotencyKey);
  }

  private async refundMercadoPagoOrder(
    providerOrderId: string,
    order: RefundableOrder,
    options: RefundOrderPaymentOptions,
  ) {
    const normalizedOrderId = String(providerOrderId || '').trim();
    const restaurantId = Number(order.restaurantId || 0);

    if (!normalizedOrderId) {
      throw new AutomaticRefundError(
        'Este pagamento Mercado Pago não possui uma referência de Order válida para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new AutomaticRefundError(
        'Não foi possível identificar o restaurante para estornar esta Order do Mercado Pago. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    const accessToken = await getMercadoPagoAccessToken(restaurantId);
    const response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(normalizedOrderId)}/refund`,
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(options.idempotencyKey
            ? { 'X-Idempotency-Key': String(options.idempotencyKey).trim() }
            : {}),
        },
      },
    );

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      console.error('[MERCADO_PAGO_ORDER_REFUND_ERROR]', {
        orderId: order.id,
        restaurantId,
        providerOrderId: normalizedOrderId,
        status: response.status,
        providerCode: String(payload.code || payload.error || '').trim() || undefined,
      });
      throw new AutomaticRefundError(
        'O Mercado Pago não confirmou o estorno do cartão. O pedido não foi cancelado e pode ser tentado novamente.',
        'PROVIDER_FAILURE',
      );
    }

    return {
      provider: 'MERCADO_PAGO',
      externalId: String(payload.id || normalizedOrderId).trim() || normalizedOrderId,
    } satisfies RefundProviderReceipt;
  }

  private async refundStripeCard(order: RefundableOrder, options: RefundOrderPaymentOptions) {
    const rawSessionId = String(order.cardCheckoutSessionId || '').trim();
    const stripeSessionId = rawSessionId;

    if (!stripeSessionId || !stripeSessionId.startsWith('cs_')) {
      throw new AutomaticRefundError(
        'Este pagamento com cartão não possui uma sessão Stripe válida para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    const restaurantId = Number(order.restaurantId || 0) || undefined;
    const settings = restaurantId
      ? await restaurantSettingsRepository.findByRestaurantId(restaurantId)
      : null;
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const secretKey = String(
      settings?.stripeSecretKey || (allowGlobalFallback ? process.env.STRIPE_SECRET_KEY : '') || '',
    ).trim();
    if (!secretKey) {
      throw new AutomaticRefundError(
        'O estorno automático está indisponível porque a chave Stripe não está configurada para este restaurante. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    const stripe = this.createStripeClient(secretKey);
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
      expand: ['payment_intent'],
    });

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      throw new AutomaticRefundError(
        'A Stripe não retornou a referência financeira necessária para o estorno. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
      },
      options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
    );

    return {
      provider: 'STRIPE',
      externalId: String(refund.id || paymentIntentId).trim(),
    } satisfies RefundProviderReceipt;
  }

  private async refundCard(order: RefundableOrder, options: RefundOrderPaymentOptions) {
    const checkoutSessionId = String(order.cardCheckoutSessionId || '').trim();
    const normalizedCheckoutSessionId = checkoutSessionId.toLowerCase();

    if (!checkoutSessionId) {
      throw new AutomaticRefundError(
        'Este pedido com cartão não possui uma referência de checkout para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    if (normalizedCheckoutSessionId.startsWith('asaas_pay:')) {
      const asaasPaymentId = checkoutSessionId.slice('asaas_pay:'.length).trim();
      return this.executeAsaasRefund(asaasPaymentId, order, options);
    }

    if (normalizedCheckoutSessionId.startsWith('mp_pay:')) {
      const paymentId = checkoutSessionId.replace(/^mp_pay:/i, '').trim();

      if (!paymentId) {
        throw new AutomaticRefundError(
          'Este pagamento Mercado Pago não possui uma referência válida para estorno automático. O pedido não foi cancelado.',
          'MISSING_REFERENCE',
        );
      }

      return this.executeMercadoPagoRefund(paymentId, order.restaurantId, options.idempotencyKey);
    }

    if (normalizedCheckoutSessionId.startsWith('mp_order:')) {
      const providerOrderId = checkoutSessionId.replace(/^mp_order:/i, '').trim();
      return this.refundMercadoPagoOrder(providerOrderId, order, options);
    }

    if (normalizedCheckoutSessionId.startsWith('mp_pref:')) {
      const preferenceId = checkoutSessionId.replace(/^mp_pref:/i, '').trim();
      const orderId = Number(order.id || 0);
      const restaurantId = Number(order.restaurantId || 0);

      if (!preferenceId || !Number.isInteger(orderId) || orderId <= 0) {
        throw new AutomaticRefundError(
          'Este pagamento Mercado Pago não possui dados suficientes para localizar a cobrança. O pedido não foi cancelado.',
          'MISSING_REFERENCE',
        );
      }

      if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
        throw new AutomaticRefundError(
          'Este pagamento Mercado Pago não possui restaurante válido para localizar a cobrança. O pedido não foi cancelado.',
          'MISSING_REFERENCE',
        );
      }

      const accessToken = await this.getMercadoPagoAccessTokenByRestaurant(order.restaurantId);
      let resolvedPaymentId = '';

      for (const externalReference of mercadoPagoCardExternalReferenceCandidates(
        orderId,
        restaurantId,
      )) {
        const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search');
        searchUrl.searchParams.set('external_reference', externalReference);
        searchUrl.searchParams.set('sort', 'date_created');
        searchUrl.searchParams.set('criteria', 'desc');
        searchUrl.searchParams.set('limit', '1');

        const response = await fetch(searchUrl.toString(), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        const payload = (await response.json().catch(() => ({}))) as {
          results?: Array<{ id?: string | number | null }>;
        };

        if (!response.ok) {
          throw new AutomaticRefundError(
            'O Mercado Pago não permitiu localizar o pagamento para estorno. O pedido não foi cancelado.',
            'PROVIDER_FAILURE',
          );
        }

        resolvedPaymentId = String(payload?.results?.[0]?.id || '').trim();
        if (resolvedPaymentId) break;
      }

      if (!resolvedPaymentId) {
        throw new AutomaticRefundError(
          'Não foi possível localizar o pagamento com cartão no Mercado Pago. O pedido não foi cancelado.',
          'MISSING_REFERENCE',
        );
      }

      return this.executeMercadoPagoRefund(
        resolvedPaymentId,
        order.restaurantId,
        options.idempotencyKey,
      );
    }


    return this.refundStripeCard(order, options);
  }

  async execute(
    order: RefundableOrder,
    options: RefundOrderPaymentOptions = {},
  ): Promise<RefundProviderReceipt> {
    const paymentMethod = String(order.paymentMethod || '').toUpperCase();
    const reference =
      paymentMethod === PaymentMethod.PIX ? order.pixPaymentId : order.cardCheckoutSessionId;
    if (options.reconcileOnly && !/^asaas(?:_pay)?:/.test(String(reference || ''))) {
      throw new AutomaticRefundError(
        'O estorno aguarda conciliação pelo provedor. Nenhuma nova solicitação foi enviada.',
        'REFUND_PENDING',
      );
    }

    if (order.paid !== true) {
      throw new AutomaticRefundError(
        'Este pedido não possui pagamento confirmado para estorno automático.',
        'NOT_SUPPORTED',
      );
    }

    try {
      if (paymentMethod === PaymentMethod.PIX) {
        return await this.refundPix(order, options);
      }

      if (paymentMethod === PaymentMethod.CARTAO) {
        return await this.refundCard(order, options);
      }
    } catch (error) {
      if (error instanceof AutomaticRefundError) {
        throw error;
      }

      console.error('[ORDER_REFUND_PROVIDER_UNEXPECTED_ERROR]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AutomaticRefundError(
        'O provedor de pagamento não confirmou o estorno. O pedido não foi cancelado e pode ser tentado novamente.',
        'PROVIDER_FAILURE',
      );
    }

    throw new AutomaticRefundError(
      'Este método de pagamento não oferece estorno automático. O pedido não foi cancelado.',
      'NOT_SUPPORTED',
    );
  }
}

export default new RefundOrderPaymentService();
