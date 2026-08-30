import Stripe from 'stripe';
import type { OrderType, PaymentMethod } from '@prisma/client';
import type { CardProvider } from '../../payments/providers/providerCatalog.js';
import { CARD_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import { getMercadoPagoPreferenceApi } from '../../payments/providers/mercadoPagoClient.js';
import { mercadoPagoOrderNotificationFields } from '../../payments/providers/mercadoPagoOrderNotification.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import prisma from '../../../config/prisma.js';

type CheckoutOrder = {
  id: number;
  restaurantId: number;
  total: number | string | { toString(): string } | null;
  systemFee?: number | string | { toString(): string } | null;
  restaurant?: {
    name?: string | null;
  } | null;
};

export type CreateOrderCardCheckoutPayload = {
  userId?: number | string | null;
  restaurantId?: number | string | null;
  userRestaurantId?: number | string | null;
  tableSessionId?: number | string | null;
  tableSessionTableId?: number | string | null;
  participantId?: number | string | null;
  settlementMode?: string | null;
  type: OrderType;
  paymentMethod?: PaymentMethod;
  observation?: string;
  customerName?: string;
  customerCpf?: string;
  customerPhone?: string;
  tableId?: number | string | null;
  cardProvider?: string;
  items: Array<{
    productId: number;
    quantity: number;
    observation?: string;
    ingredientIds?: number[];
    optionIds?: number[];
    selectedOptions?: Array<{ groupId: number; optionIds: number[] }>;
  }>;
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
  successUrl?: string;
  cancelUrl?: string;
  couponRedemptionId?: number | string | null;
  paymentMethodId?: string | null;
  customerIp?: string | null;
};

export type CardCheckoutResult = {
  provider: CardProvider;
  sessionId: string;
  checkoutUrl: string;
  persistenceSessionId?: string;
  paymentApproved?: boolean;
};

type CardCheckoutProviderContext = {
  payload: CreateOrderCardCheckoutPayload;
  order: CheckoutOrder;
  successUrlBase: string;
  cancelUrlBase: string;
};

export type CardCheckoutProviderHandler = {
  createCheckout(context: CardCheckoutProviderContext): Promise<CardCheckoutResult>;
};

function withQueryParam(baseUrl: string, params: Record<string, string>) {
  try {
    const nextUrl = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      nextUrl.searchParams.set(key, value);
    });

    return nextUrl.toString();
  } catch {
    return baseUrl;
  }
}

async function getStripeClient(restaurantId: number) {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const settingsSecretKey = String(settings?.stripeSecretKey || '').trim();
  const globalSecretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  const secretKey = settingsSecretKey || (allowGlobalFallback ? globalSecretKey : '');

  if (!secretKey) {
    throw new Error(
      'Pagamento com cartao indisponivel. Configure chave secreta Stripe nas configuracoes do restaurante.',
    );
  }

  return new Stripe(secretKey);
}

type PagBankCredentials = {
  email: string;
  token: string;
  environment: 'production';
};

type AsaasErrorItem = {
  code?: string;
  description?: string;
};

type AsaasCustomerPayload = {
  id?: string;
  errors?: AsaasErrorItem[];
};

type AsaasCardPaymentPayload = {
  id?: string;
  invoiceUrl?: string;
  status?: string;
  errors?: AsaasErrorItem[];
};

function resolvePagBankEnvironment(): 'production' {
  // Ambiente de checkout PagBank fixado em producao.
  return 'production';
}

async function getPagBankCredentials(restaurantId: number): Promise<PagBankCredentials> {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const settingsEmail = String(settings?.pagbankEmail || '').trim();
  const settingsToken = String(settings?.pagbankToken || '').trim();
  const globalEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || '').trim();
  const globalToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || '').trim();
  const email = settingsEmail || (allowGlobalFallback ? globalEmail : '');
  const token = settingsToken || (allowGlobalFallback ? globalToken : '');
  const environment = resolvePagBankEnvironment();

  if (!email || !token) {
    throw new Error(
      'Pagamento com cartao PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante.',
    );
  }

  return { email, token, environment };
}

function resolvePagBankCheckoutApiUrl(environment: 'production') {
  void environment;
  return 'https://ws.pagseguro.uol.com.br/v2/checkout';
}

function resolvePagBankCheckoutPageBaseUrl(environment: 'production') {
  void environment;
  return 'https://pagseguro.uol.com.br/v2/checkout/payment.html';
}

function resolveAsaasBaseUrl() {
  return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
    .trim()
    .replace(/\/+$/, '');
}

async function getAsaasAccessToken(restaurantId: number) {
  const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true';
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const settingsToken = String(settings?.asaasAccessToken || '').trim();
  const globalToken = String(process.env.ASAAS_API_KEY || '').trim();
  const accessToken = settingsToken || (allowGlobalFallback ? globalToken : '');

  if (!accessToken) {
    throw new Error(
      'Pagamento com cartao Asaas indisponivel. Configure token Asaas nas configuracoes do restaurante.',
    );
  }

  return accessToken;
}

function getAsaasError(payload: { errors?: AsaasErrorItem[] }, fallback: string) {
  if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
    return fallback;
  }

  const message = String(payload.errors[0]?.description || '').trim();
  return message || fallback;
}

async function fetchAsaasJson<T>(
  url: string,
  accessToken: string,
  {
    method = 'GET',
    body,
  }: {
    method?: 'GET' | 'POST';
    body?: unknown;
  } = {},
) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: accessToken,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const responseBody = (await response.json()) as T;

  return {
    ok: response.ok,
    responseBody,
  };
}

function resolvePagBankNotificationUrl(restaurantId?: number) {
  const explicitNotificationUrl = String(process.env.PAGBANK_NOTIFICATION_URL || '').trim();

  const backendUrl = String(process.env.BACKEND_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const baseNotificationUrl =
    explicitNotificationUrl || (backendUrl ? `${backendUrl}/orders/webhook/pagbank` : '');

  if (!baseNotificationUrl || !restaurantId) {
    return baseNotificationUrl;
  }

  return withQueryParam(baseNotificationUrl, {
    restaurantId: String(restaurantId),
  });
}

function extractXmlTagValue(xml: string, tag: string) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
  const match = regex.exec(String(xml || ''));

  return String(match?.[1] || '').trim();
}

function extractProviderErrorText(error: unknown) {
  if (typeof error === 'string') {
    return error.trim().toLowerCase();
  }

  const asRecord =
    typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : null;
  const message = String(
    asRecord?.message || (asRecord?.cause as { message?: unknown } | undefined)?.message || '',
  );
  const causeText = String(asRecord?.cause || '');
  return `${message} ${causeText}`.trim().toLowerCase();
}

function isMarketplaceSplitConfigurationError(error: unknown) {
  const text = extractProviderErrorText(error);

  if (!text) {
    return false;
  }

  return (
    text.includes('marketplace_fee') ||
    text.includes('application_fee') ||
    text.includes('marketplace') ||
    text.includes('split') ||
    text.includes('collector') ||
    text.includes('platform') ||
    text.includes('not allowed') ||
    text.includes('unauthorized') ||
    text.includes('invalid')
  );
}

const stripeCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ order, successUrlBase, cancelUrlBase }) {
    const stripe = await getStripeClient(order.restaurantId);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(Number(order.total || 0) * 100),
            product_data: {
              name: `Pedido #${order.id}`,
              description: order.restaurant?.name || 'Pedido online',
            },
          },
        },
      ],
      metadata: {
        orderId: String(order.id),
        restaurantId: String(order.restaurantId),
      },
      success_url: withQueryParam(successUrlBase, {
        cardCheckoutStatus: 'success',
        orderId: String(order.id),
      }),
      cancel_url: withQueryParam(cancelUrlBase, {
        cardCheckoutStatus: 'cancel',
        orderId: String(order.id),
      }),
    });

    return {
      provider: CARD_PROVIDERS.STRIPE,
      sessionId: String(session.id),
      checkoutUrl: String(session.url || ''),
    };
  },
};

const mercadoPagoCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ payload, order, successUrlBase, cancelUrlBase }) {
    const preferenceApi = await getMercadoPagoPreferenceApi(order.restaurantId);
    const marketplaceFee = Number(order.systemFee || 0);
    const savedMethodId = String(payload.paymentMethodId || '').trim();
    let payerEmail = '';

    if (savedMethodId) {
      const userId = Number(payload.userId || 0);
      if (!userId) throw new Error('Entre na sua conta para pagar com um cartão salvo.');
      const savedMethod = await prisma.customerPaymentMethod.findFirst({
        where: {
          publicId: savedMethodId,
          userId,
          restaurantId: order.restaurantId,
          provider: 'MERCADO_PAGO',
          active: true,
        },
      });
      if (!savedMethod?.providerCustomerId) {
        throw new Error('O cartão selecionado não foi encontrado no Mercado Pago.');
      }
      const payer = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      payerEmail = String(payer?.email || '').trim();
    }

    const buildPreferenceBody = (includeMarketplaceFee: boolean) => ({
      items: [
        {
          id: String(order.id),
          title: `Pedido #${order.id}`,
          description: order.restaurant?.name || 'Pedido online',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(order.total || 0),
        },
      ],
      external_reference: `ordercard:${order.id}:${order.restaurantId}`,
      metadata: {
        order_id: String(order.id),
        restaurant_id: String(order.restaurantId),
        source: 'order_card_checkout',
      },
      ...(payerEmail ? { payer: { email: payerEmail } } : {}),
      ...(includeMarketplaceFee && marketplaceFee > 0 ? { marketplace_fee: marketplaceFee } : {}),
      ...mercadoPagoOrderNotificationFields(order.restaurantId),
      back_urls: {
        success: withQueryParam(successUrlBase, {
          cardCheckoutStatus: 'success',
          orderId: String(order.id),
        }),
        failure: withQueryParam(cancelUrlBase, {
          cardCheckoutStatus: 'cancel',
          orderId: String(order.id),
        }),
        pending: withQueryParam(successUrlBase, {
          cardCheckoutStatus: 'pending',
          orderId: String(order.id),
        }),
      },
    });

    let response: unknown;

    if (marketplaceFee > 0) {
      try {
        response = await preferenceApi.create({
          body: buildPreferenceBody(true),
        });
      } catch (error) {
        if (!isMarketplaceSplitConfigurationError(error)) {
          throw error;
        }

        console.warn(
          '[CARD_SPLIT_FALLBACK] Mercado Pago rejeitou marketplace_fee. Recriando checkout sem split.',
          {
            orderId: order.id,
            restaurantId: order.restaurantId,
            marketplaceFee,
          },
        );

        response = await preferenceApi.create({
          body: buildPreferenceBody(false),
        });
      }
    } else {
      response = await preferenceApi.create({
        body: buildPreferenceBody(false),
      });
    }

    const preference =
      typeof response === 'object' && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const preferenceId = String((preference as { id?: unknown }).id || '').trim();
    const checkoutUrl = String((preference as { init_point?: unknown }).init_point || '').trim();

    if (!preferenceId || !checkoutUrl) {
      throw new Error('Nao foi possivel criar checkout de cartao no Mercado Pago.');
    }

    return {
      provider: CARD_PROVIDERS.MERCADO_PAGO,
      sessionId: preferenceId,
      persistenceSessionId: `mp_pref:${preferenceId}`,
      checkoutUrl,
    };
  },
};

const pagBankCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ payload, order, successUrlBase }) {
    const { email, token, environment } = await getPagBankCredentials(order.restaurantId);

    const savedMethodId = String(payload.paymentMethodId || '').trim();
    if (savedMethodId) {
      const userId = Number(payload.userId || 0);
      if (!userId) throw new Error('Entre na sua conta para pagar com um cartão salvo.');
      const savedMethod = await prisma.customerPaymentMethod.findFirst({
        where: {
          publicId: savedMethodId,
          userId,
          restaurantId: order.restaurantId,
          provider: 'PAGBANK',
          active: true,
        },
      });
      if (!savedMethod) throw new Error('O cartão selecionado não foi encontrado.');
      const cpf = String(payload.customerCpf || '').replace(/\D/g, '');
      if (![11, 14].includes(cpf.length)) {
        throw new Error('Cadastre um CPF válido nos seus dados pessoais para pagar com cartão salvo.');
      }
      const apiBaseUrl = String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com')
        .trim()
        .replace(/\/+$/, '');
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-idempotency-key': `order-card-${order.restaurantId}-${order.id}`,
        },
        body: JSON.stringify({
          reference_id: `ordercard:${order.id}:${order.restaurantId}`,
          customer: {
            name: String(payload.customerName || 'Cliente').trim(),
            tax_id: cpf,
          },
          items: [{
            reference_id: String(order.id),
            name: `Pedido #${order.id}`,
            quantity: 1,
            unit_amount: Math.round(Number(order.total || 0) * 100),
          }],
          charges: [{
            reference_id: `ordercard:${order.id}:${order.restaurantId}`,
            description: `Pedido #${order.id}`,
            amount: { value: Math.round(Number(order.total || 0) * 100), currency: 'BRL' },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: 1,
              capture: true,
              card: { id: savedMethod.providerPaymentMethodId },
              holder: { name: savedMethod.holderName || String(payload.customerName || 'Cliente'), tax_id: cpf },
            },
          }],
          ...(resolvePagBankNotificationUrl(order.restaurantId)
            ? { notification_urls: [resolvePagBankNotificationUrl(order.restaurantId)] }
            : {}),
        }),
      });
      const responseBody = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const charges = Array.isArray(responseBody.charges) ? responseBody.charges : [];
      const charge = (charges[0] || {}) as Record<string, unknown>;
      if (!response.ok) {
        const errors = Array.isArray(responseBody.error_messages) ? responseBody.error_messages : [];
        const first = errors[0] as { description?: unknown } | undefined;
        throw new Error(String(first?.description || responseBody.message || 'O PagBank recusou o pagamento.'));
      }
      const status = String(charge.status || '').toUpperCase();
      const transactionId = String(charge.id || responseBody.id || '').trim();
      if (!transactionId) throw new Error('O PagBank não retornou a identificação do pagamento.');
      return {
        provider: CARD_PROVIDERS.PAGBANK,
        sessionId: transactionId,
        persistenceSessionId: `pagbank_tx:${transactionId}`,
        checkoutUrl: withQueryParam(successUrlBase, {
          cardCheckoutStatus: status === 'PAID' ? 'success' : 'pending',
          orderId: String(order.id),
        }),
        paymentApproved: status === 'PAID',
      };
    }

    const params = new URLSearchParams();
    params.set('email', email);
    params.set('token', token);
    params.set('currency', 'BRL');
    params.set('itemId1', String(order.id));
    params.set('itemDescription1', `Pedido #${order.id}`);
    params.set('itemAmount1', Number(order.total || 0).toFixed(2));
    params.set('itemQuantity1', '1');
    params.set('reference', `ordercard:${order.id}:${order.restaurantId}`);
    params.set(
      'redirectURL',
      withQueryParam(successUrlBase, {
        cardCheckoutStatus: 'success',
        orderId: String(order.id),
      }),
    );

    const notificationUrl = resolvePagBankNotificationUrl(order.restaurantId);
    if (notificationUrl) {
      params.set('notificationURL', notificationUrl);
    }

    const response = await fetch(resolvePagBankCheckoutApiUrl(environment), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    if (!response.ok) {
      const providerMessage =
        extractXmlTagValue(responseText, 'message') ||
        extractXmlTagValue(responseText, 'error') ||
        'Falha ao criar checkout no PagBank.';
      throw new Error(`PagBank: ${providerMessage}`);
    }

    const checkoutCode = extractXmlTagValue(responseText, 'code');
    if (!checkoutCode) {
      throw new Error('PagBank nao retornou codigo de checkout.');
    }

    const checkoutUrl = `${resolvePagBankCheckoutPageBaseUrl(environment)}?code=${encodeURIComponent(checkoutCode)}`;

    return {
      provider: CARD_PROVIDERS.PAGBANK,
      sessionId: checkoutCode,
      persistenceSessionId: `pagbank_chk:${checkoutCode}`,
      checkoutUrl,
    };
  },
};

const asaasCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ payload, order, successUrlBase }) {
    const asaasBaseUrl = resolveAsaasBaseUrl();
    const accessToken = await getAsaasAccessToken(order.restaurantId);
    const savedMethodId = String(payload.paymentMethodId || '').trim();

    if (savedMethodId) {
      const userId = Number(payload.userId || 0);
      if (!userId) throw new Error('Entre na sua conta para pagar com um cartão salvo.');
      const savedMethod = await prisma.customerPaymentMethod.findFirst({
        where: {
          publicId: savedMethodId,
          userId,
          restaurantId: order.restaurantId,
          provider: 'ASAAS',
          active: true,
        },
      });
      if (!savedMethod?.providerCustomerId) {
        throw new Error('O cartão selecionado não foi encontrado no Asaas.');
      }

      const paymentResult = await fetchAsaasJson<AsaasCardPaymentPayload>(
        `${asaasBaseUrl}/v3/payments`,
        accessToken,
        {
          method: 'POST',
          body: {
            customer: savedMethod.providerCustomerId,
            billingType: 'CREDIT_CARD',
            value: Number(order.total || 0),
            dueDate: new Date().toISOString().slice(0, 10),
            description: `Pedido #${order.id}`,
            externalReference: `ordercard:${order.id}:${order.restaurantId}`,
            creditCardToken: savedMethod.providerPaymentMethodId,
            remoteIp: String(payload.customerIp || '').trim() || undefined,
          },
        },
      );

      if (!paymentResult.ok) {
        throw new Error(
          getAsaasError(paymentResult.responseBody, 'O Asaas recusou o pagamento com o cartão salvo.'),
        );
      }

      const sessionId = String(paymentResult.responseBody?.id || '').trim();
      const status = String(paymentResult.responseBody?.status || '').trim().toUpperCase();
      if (!sessionId) throw new Error('O Asaas não retornou a identificação do pagamento.');
      const paymentApproved = ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(status);

      return {
        provider: CARD_PROVIDERS.ASAAS,
        sessionId,
        persistenceSessionId: `asaas_pay:${sessionId}`,
        checkoutUrl: withQueryParam(successUrlBase, {
          cardCheckoutStatus: paymentApproved ? 'success' : 'pending',
          orderId: String(order.id),
        }),
        paymentApproved,
      };
    }

    const payerEmail = String(payload.userId ? '' : '').trim();
    const customerName = String(payload.customerName || 'Cliente').trim();
    const cpf = String(payload.customerCpf || '').replace(/\D/g, '');
    const normalizedEmail =
      String(payload.customerName || '').trim() && payload.customerCpf
        ? `guest.card.${order.restaurantId}.${Date.now()}@pecaja.local`
        : `guest.card.${order.restaurantId}.${Date.now()}@pecaja.local`;

    const customerResult = await fetchAsaasJson<AsaasCustomerPayload>(
      `${asaasBaseUrl}/v3/customers`,
      accessToken,
      {
        method: 'POST',
        body: {
          name: customerName || 'Cliente',
          email: payerEmail || normalizedEmail,
          ...(cpf.length === 11 ? { cpfCnpj: cpf } : {}),
          ...(payload.customerPhone
            ? {
                mobilePhone: String(payload.customerPhone).replace(/\D/g, ''),
              }
            : {}),
        },
      },
    );

    if (!customerResult.ok || !String(customerResult.responseBody?.id || '').trim()) {
      throw new Error(
        getAsaasError(
          customerResult.responseBody,
          'Nao foi possivel criar/identificar cliente para checkout de cartao no Asaas.',
        ),
      );
    }

    const customerId = String(customerResult.responseBody.id || '').trim();
    const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
    const walletId = String(settings?.gatewayMerchantId || '').trim();
    const platformWalletId = String(process.env.ASAAS_PLATFORM_WALLET_ID || '').trim();
    const systemFee = Number(order.systemFee || 0);

    const buildPaymentBody = (includeSplit: boolean) => ({
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number(order.total || 0),
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Pedido #${order.id}`,
      externalReference: String(order.id),
      ...(includeSplit && systemFee > 0 && platformWalletId
        ? {
            split: [
              {
                walletId: platformWalletId,
                fixedValue: systemFee,
              },
              ...(walletId
                ? [
                    {
                      walletId,
                      remainingValue: true,
                    },
                  ]
                : []),
            ],
          }
        : {}),
    });

    let paymentResult = await fetchAsaasJson<AsaasCardPaymentPayload>(
      `${asaasBaseUrl}/v3/payments`,
      accessToken,
      {
        method: 'POST',
        body: buildPaymentBody(systemFee > 0),
      },
    );

    const shouldRetryWithoutSplit =
      systemFee > 0 &&
      !paymentResult.ok &&
      isMarketplaceSplitConfigurationError(
        getAsaasError(paymentResult.responseBody, 'Erro ao criar checkout de cartao no Asaas.'),
      );

    if (shouldRetryWithoutSplit) {
      console.warn(
        '[ASAAS_CARD_SPLIT_FALLBACK] Asaas rejeitou split. Recriando checkout sem split.',
        {
          orderId: order.id,
          restaurantId: order.restaurantId,
          systemFee,
        },
      );

      paymentResult = await fetchAsaasJson<AsaasCardPaymentPayload>(
        `${asaasBaseUrl}/v3/payments`,
        accessToken,
        {
          method: 'POST',
          body: buildPaymentBody(false),
        },
      );
    }

    if (!paymentResult.ok) {
      throw new Error(
        getAsaasError(
          paymentResult.responseBody,
          'Nao foi possivel criar checkout de cartao no Asaas.',
        ),
      );
    }

    const sessionId = String(paymentResult.responseBody?.id || '').trim();
    const checkoutUrl = String(paymentResult.responseBody?.invoiceUrl || '').trim();

    if (!sessionId || !checkoutUrl) {
      throw new Error('Asaas nao retornou link de checkout para pagamento com cartao.');
    }

    return {
      provider: CARD_PROVIDERS.ASAAS,
      sessionId,
      persistenceSessionId: `asaas_pay:${sessionId}`,
      checkoutUrl,
    };
  },
};

const CARD_CHECKOUT_PROVIDER_HANDLERS: Partial<Record<CardProvider, CardCheckoutProviderHandler>> =
  {
    [CARD_PROVIDERS.STRIPE]: stripeCardCheckoutProvider,
    [CARD_PROVIDERS.MERCADO_PAGO]: mercadoPagoCardCheckoutProvider,
    [CARD_PROVIDERS.PAGBANK]: pagBankCardCheckoutProvider,
    [CARD_PROVIDERS.ASAAS]: asaasCardCheckoutProvider,
  };

export function getCardCheckoutProviderHandler(provider: CardProvider) {
  const handler = CARD_CHECKOUT_PROVIDER_HANDLERS[provider];

  if (!handler) {
    throw new Error(
      `Gateway de cartao ${provider} ainda nao integrado. Configure STRIPE, MERCADO_PAGO, PAGBANK ou ASAAS para processar checkout com cartao no momento.`,
    );
  }

  return handler;
}
