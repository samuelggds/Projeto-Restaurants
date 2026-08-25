import Stripe from 'stripe';
import { PaymentMethod } from '@prisma/client';
import { getMercadoPagoPaymentRefundApi } from '../../payments/providers/mercadoPagoClient.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';

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
  provider: 'ASAAS' | 'MERCADO_PAGO' | 'PAGBANK' | 'STRIPE';
  externalId: string | null;
};

export type RefundOrderPaymentOptions = {
  idempotencyKey?: string | null;
  verifyExistingRefund?: boolean;
};

export class AutomaticRefundError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'NOT_SUPPORTED'
      | 'MISSING_REFERENCE'
      | 'MISSING_CREDENTIALS'
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
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};

type PagBankOrderRefundPayload = {
  id?: string;
  charges?: Array<{
    id?: string;
    status?: string;
    summary?: {
      refunded?: number;
    };
  }>;
  error_messages?: Array<{
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

  private extractAsaasError(payload: AsaasRefundResponse) {
    const firstError = Array.isArray(payload?.errors) ? payload.errors[0] : undefined;
    return {
      code: String(firstError?.code || '').trim(),
      description: String(firstError?.description || '').trim(),
    };
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
    if (options.verifyExistingRefund) {
      const currentPaymentResponse = await fetch(paymentUrl, {
        headers: {
          Accept: 'application/json',
          access_token: accessToken,
        },
      });
      const currentPayment = (await currentPaymentResponse
        .json()
        .catch(() => ({}))) as AsaasRefundResponse;

      if (
        currentPaymentResponse.ok &&
        String(currentPayment.status || '').toUpperCase() === 'REFUNDED'
      ) {
        return {
          provider: 'ASAAS',
          externalId: String(currentPayment.id || normalizedPaymentId).trim(),
        } satisfies RefundProviderReceipt;
      }
    }

    const response = await fetch(`${paymentUrl}/refund`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        access_token: accessToken,
      },
      body: JSON.stringify({
        ...(amount ? { value: amount } : {}),
        description: `Estorno do pedido #${String(order.id)}`,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as AsaasRefundResponse;

    if (!response.ok) {
      const providerError = this.extractAsaasError(payload);
      console.error('[ASAAS_REFUND_ERROR]', {
        orderId: order.id,
        restaurantId,
        paymentId: normalizedPaymentId,
        status: response.status,
        code: providerError.code || undefined,
        description: providerError.description || undefined,
      });
      throw new AutomaticRefundError(
        'O Asaas não confirmou o estorno. O pedido não foi cancelado e pode ser tentado novamente.',
        'PROVIDER_FAILURE',
      );
    }

    return {
      provider: 'ASAAS',
      externalId: String(payload.id || normalizedPaymentId).trim() || normalizedPaymentId,
    } satisfies RefundProviderReceipt;
  }

  private resolvePagBankEnvironment(): 'production' {
    // Refund API is currently supported against production endpoint.
    return 'production';
  }

  private resolvePagBankApiBaseUrl(environment: 'production') {
    void environment;
    return 'https://ws.pagseguro.uol.com.br';
  }

  private extractXmlTagValue(xml: string, tag: string) {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
    const match = regex.exec(String(xml || ''));

    return String(match?.[1] || '').trim();
  }

  private parsePagBankErrorDetails(xml: string) {
    const normalizedXml = String(xml || '').trim();

    if (!normalizedXml) {
      return {
        code: '',
        message: '',
      };
    }

    const errorBlockMatch = /<error>([\s\S]*?)<\/error>/i.exec(normalizedXml);
    const errorScope = errorBlockMatch?.[1] || normalizedXml;

    const code =
      this.extractXmlTagValue(errorScope, 'code') || this.extractXmlTagValue(normalizedXml, 'code');
    const message =
      this.extractXmlTagValue(errorScope, 'message') ||
      this.extractXmlTagValue(normalizedXml, 'message') ||
      this.extractXmlTagValue(errorScope, 'error') ||
      this.extractXmlTagValue(normalizedXml, 'error');

    return {
      code,
      message,
    };
  }

  private async getPagBankCredentials(restaurantId?: number) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const settings = restaurantId
      ? await restaurantSettingsRepository.findByRestaurantId(restaurantId)
      : null;

    const email = String(
      settings?.pagbankEmail ||
        (allowGlobalFallback ? process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL : '') ||
        '',
    ).trim();
    const token = String(
      settings?.pagbankToken ||
        (allowGlobalFallback ? process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN : '') ||
        '',
    ).trim();

    if (!email || !token) {
      throw new AutomaticRefundError(
        'O estorno automático está indisponível porque as credenciais PagBank não estão configuradas para este restaurante. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    return {
      email,
      token,
      environment: this.resolvePagBankEnvironment(),
    };
  }

  private parseAmount(value: RefundableOrder['total']) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : undefined;
  }

  private async getMercadoPagoAccessTokenByRestaurant(restaurantId?: number | string | null) {
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

  private resolvePagBankOrderApiBaseUrl() {
    return String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com')
      .trim()
      .replace(/\/+$/, '');
  }

  private async getPagBankBearerToken(restaurantId?: number) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
    const settings =
      Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
        ? await restaurantSettingsRepository.findByRestaurantId(normalizedRestaurantId)
        : null;
    const token = String(
      settings?.pagbankToken || (allowGlobalFallback ? process.env.PAGBANK_TOKEN : '') || '',
    ).trim();

    if (!token) {
      throw new AutomaticRefundError(
        'O estorno automático está indisponível porque a credencial PagBank não está configurada para este restaurante. O pedido não foi cancelado.',
        'MISSING_CREDENTIALS',
      );
    }

    return token;
  }

  private async refundPagBankPixOrder(
    pagBankOrderId: string,
    order: RefundableOrder,
    idempotencyKey?: string | null,
  ) {
    const normalizedOrderId = String(pagBankOrderId || '').trim();
    const restaurantId = Number(order.restaurantId || 0);
    if (!normalizedOrderId) {
      throw new AutomaticRefundError(
        'Este Pix PagBank não possui uma referência válida para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    const token = await this.getPagBankBearerToken(restaurantId);
    const apiBaseUrl = this.resolvePagBankOrderApiBaseUrl();
    const orderResponse = await fetch(
      `${apiBaseUrl}/orders/${encodeURIComponent(normalizedOrderId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );
    const orderPayload = (await orderResponse
      .json()
      .catch(() => ({}))) as PagBankOrderRefundPayload;

    if (!orderResponse.ok) {
      console.error('[PAGBANK_PIX_REFUND_LOOKUP_ERROR]', {
        orderId: order.id,
        restaurantId,
        pagBankOrderId: normalizedOrderId,
        status: orderResponse.status,
      });
      throw new AutomaticRefundError(
        'O PagBank não permitiu localizar a cobrança Pix para estorno. O pedido não foi cancelado.',
        'PROVIDER_FAILURE',
      );
    }

    const expectedAmountInCents = Math.round(Number(order.total || 0) * 100);
    const charges = Array.isArray(orderPayload.charges) ? orderPayload.charges : [];
    const paidCharge = charges.find(
      (charge) => String(charge.status || '').toUpperCase() === 'PAID' && charge.id,
    );
    const alreadyRefundedCharge = charges.find((charge) => {
      const status = String(charge.status || '').toUpperCase();
      const refundedAmount = Number(charge.summary?.refunded || 0);
      return (
        status === 'CANCELED' &&
        Boolean(charge.id) &&
        expectedAmountInCents > 0 &&
        refundedAmount >= expectedAmountInCents
      );
    });

    if (alreadyRefundedCharge?.id) {
      return {
        provider: 'PAGBANK',
        externalId: String(alreadyRefundedCharge.id),
      } satisfies RefundProviderReceipt;
    }

    if (!paidCharge?.id || expectedAmountInCents <= 0) {
      throw new AutomaticRefundError(
        'O PagBank não retornou uma cobrança Pix paga e elegível para estorno. O pedido não foi cancelado.',
        'NOT_SUPPORTED',
      );
    }

    const cancelResponse = await fetch(
      `${apiBaseUrl}/charges/${encodeURIComponent(String(paidCharge.id))}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
        },
        body: JSON.stringify({
          amount: {
            value: expectedAmountInCents,
          },
        }),
      },
    );
    const cancelPayload = (await cancelResponse
      .json()
      .catch(() => ({}))) as PagBankOrderRefundPayload;

    if (!cancelResponse.ok) {
      console.error('[PAGBANK_PIX_REFUND_ERROR]', {
        orderId: order.id,
        restaurantId,
        chargeId: paidCharge.id,
        status: cancelResponse.status,
        providerCode: cancelPayload.error_messages?.[0]?.code || undefined,
      });
      throw new AutomaticRefundError(
        'O PagBank não confirmou o estorno do Pix. O pedido não foi cancelado e pode ser tentado novamente.',
        'PROVIDER_FAILURE',
      );
    }

    return {
      provider: 'PAGBANK',
      externalId: String(cancelPayload.id || paidCharge.id).trim(),
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

    if (normalizedPaymentId.startsWith('asaas:')) {
      const asaasPaymentId = paymentId.slice('asaas:'.length).trim();
      return this.executeAsaasRefund(asaasPaymentId, order, options);
    }

    if (normalizedPaymentId.startsWith('pagbank:')) {
      const pagBankOrderId = paymentId.slice('pagbank:'.length).trim();
      return this.refundPagBankPixOrder(pagBankOrderId, order, options.idempotencyKey);
    }

    return this.executeMercadoPagoRefund(paymentId, order.restaurantId, options.idempotencyKey);
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

  private async refundPagBankByTransaction(
    transactionCode: string,
    order: RefundableOrder,
    options: RefundOrderPaymentOptions,
  ) {
    const normalizedTransactionCode = String(transactionCode || '').trim();

    if (!normalizedTransactionCode) {
      throw new AutomaticRefundError(
        'Este pagamento PagBank não possui uma transação válida para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    const restaurantId = Number(order.restaurantId || 0) || undefined;
    const { email, token, environment } = await this.getPagBankCredentials(restaurantId);
    const amount = this.parseAmount(order.total);

    if (options.verifyExistingRefund) {
      const queryUrl = `${this.resolvePagBankApiBaseUrl(environment)}/v3/transactions/${encodeURIComponent(normalizedTransactionCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
      const queryResponse = await fetch(queryUrl, { method: 'GET' });
      const queryText = await queryResponse.text().catch(() => '');
      const currentStatus = this.extractXmlTagValue(queryText, 'status');
      if (queryResponse.ok && currentStatus === '6') {
        return {
          provider: 'PAGBANK',
          externalId: normalizedTransactionCode,
        } satisfies RefundProviderReceipt;
      }
    }

    const params = new URLSearchParams();
    params.set('transactionCode', normalizedTransactionCode);
    if (amount) {
      params.set('refundValue', amount.toFixed(2));
    }

    // Este serviço só recebe pedidos cujo pagamento já foi confirmado. Na API
    // clássica do PagBank, transações pagas são devolvidas por /refunds;
    // /cancels é exclusivo para operações ainda aguardando/em análise.
    const credentials = new URLSearchParams({ email, token });
    const url = `${this.resolvePagBankApiBaseUrl(environment)}/v2/transactions/refunds?${credentials.toString()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: params.toString(),
    });

    const responseText = await response.text().catch(() => '');
    const parsedError = this.parsePagBankErrorDetails(responseText);

    if (!response.ok) {
      const fallbackSnippet = String(responseText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);
      const providerMessage =
        parsedError.message ||
        (fallbackSnippet
          ? `Falha ao estornar no PagBank. Resposta: ${fallbackSnippet}`
          : 'Falha ao estornar no PagBank.');
      const detailsSuffix = parsedError.code ? ` (code ${parsedError.code})` : '';
      console.error('[PAGBANK_CARD_REFUND_ERROR]', {
        orderId: order.id,
        restaurantId,
        transactionCode: normalizedTransactionCode,
        status: response.status,
        code: parsedError.code || undefined,
        providerMessage,
        detailsSuffix,
      });
      throw new AutomaticRefundError(
        'O PagBank não confirmou o estorno do cartão. O pedido não foi cancelado e pode ser tentado novamente.',
        'PROVIDER_FAILURE',
      );
    }

    // Some PagBank responses return HTTP 200 with XML error payload.
    if (parsedError.code && parsedError.message) {
      console.error('[PAGBANK_CARD_REFUND_XML_ERROR]', {
        orderId: order.id,
        restaurantId,
        transactionCode: normalizedTransactionCode,
        status: response.status,
        code: parsedError.code,
        providerMessage: parsedError.message,
      });
      throw new AutomaticRefundError(
        'O PagBank não confirmou o estorno do cartão. O pedido não foi cancelado e pode ser tentado novamente.',
        'PROVIDER_FAILURE',
      );
    }

    return {
      provider: 'PAGBANK',
      externalId: normalizedTransactionCode,
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

      const externalReference =
        Number.isInteger(restaurantId) && restaurantId > 0
          ? `ordercard:${orderId}:${restaurantId}`
          : `ordercard:${orderId}`;
      const searchUrl = new URL('https://api.mercadopago.com/v1/payments/search');
      searchUrl.searchParams.set('external_reference', externalReference);
      searchUrl.searchParams.set('sort', 'date_created');
      searchUrl.searchParams.set('criteria', 'desc');
      searchUrl.searchParams.set('limit', '1');

      const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await this.getMercadoPagoAccessTokenByRestaurant(order.restaurantId)}`,
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

      const resolvedPaymentId = String(payload?.results?.[0]?.id || '').trim();

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

    if (normalizedCheckoutSessionId.startsWith('pagbank_chk:')) {
      throw new AutomaticRefundError(
        'O pagamento PagBank ainda não possui o código da transação necessário para estorno automático. O pedido não foi cancelado.',
        'MISSING_REFERENCE',
      );
    }

    if (normalizedCheckoutSessionId.startsWith('pagbank_tx:')) {
      const transactionCode = checkoutSessionId.replace(/^pagbank_tx:/i, '').trim();

      return this.refundPagBankByTransaction(transactionCode, order, options);
    }

    if (normalizedCheckoutSessionId.startsWith('pagbank:')) {
      throw new AutomaticRefundError(
        'Este identificador PagBank não oferece estorno automático. O pedido não foi cancelado.',
        'NOT_SUPPORTED',
      );
    }

    return this.refundStripeCard(order, options);
  }

  async execute(
    order: RefundableOrder,
    options: RefundOrderPaymentOptions = {},
  ): Promise<RefundProviderReceipt> {
    const paymentMethod = String(order.paymentMethod || '').toUpperCase();

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
