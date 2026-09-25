import type { OrderCreationContext } from './orderCreationRequest.js';
import type { OrderType, PaymentMethod } from '@prisma/client';
import type { CardProvider } from '../../payments/providers/providerCatalog.js';
import { CARD_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import { getMercadoPagoPreferenceApi } from '../../payments/providers/mercadoPagoClient.js';
import { mercadoPagoOrderNotificationFields } from '../../payments/providers/mercadoPagoOrderNotification.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { mercadoPagoCardExternalReference } from '../domain/mercadoPagoCardReference.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';
import { assertFuturePaymentProviderEnabled } from '../../payments/providers/futurePaymentProviders.js';

type CheckoutOrder = {
  id: number;
  publicId: string;
  restaurantId: number;
  total: number | string | { toString(): string } | null;
  systemFee?: number | string | { toString(): string } | null;
  restaurant?: {
    name?: string | null;
  } | null;
};

export type CreateOrderCardCheckoutPayload = {
  creationRequest?: OrderCreationContext;
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
  paymentScope?: 'ORDER' | 'TABLE_ACCOUNT';
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
  value?: number;
  billingType?: string;
  externalReference?: string;
  errors?: AsaasErrorItem[];
};


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
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
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


const mercadoPagoCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ payload, order, successUrlBase, cancelUrlBase }) {
    const preferenceApi = await getMercadoPagoPreferenceApi(order.restaurantId);
    const savedMethodId = String(payload.paymentMethodId || '').trim();
    let payerEmail = '';

    if (savedMethodId) {
      const userId = Number(payload.userId || 0);
      if (!userId) throw new Error('Entre na sua conta para pagar com um cartão salvo.');
      const savedMethod = await withTenantDbContext(order.restaurantId, (db) =>
        db.customerPaymentMethod.findFirst({
          where: {
            publicId: savedMethodId,
            userId,
            restaurantId: order.restaurantId,
            provider: 'MERCADO_PAGO',
            active: true,
          },
        }),
      );
      if (!savedMethod?.providerCustomerId) {
        throw new Error('O cartão selecionado não foi encontrado no Mercado Pago.');
      }
      const payer = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      payerEmail = String(payer?.email || '').trim();
    }

    const preferenceBody = {
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
      external_reference: mercadoPagoCardExternalReference(order.id, order.restaurantId),
      metadata: {
        order_id: String(order.id),
        restaurant_id: String(order.restaurantId),
        source: 'order_card_checkout',
      },
      ...(payerEmail ? { payer: { email: payerEmail } } : {}),
      ...mercadoPagoOrderNotificationFields(order.restaurantId),
      back_urls: {
        success: withQueryParam(successUrlBase, {
          cardCheckoutStatus: 'success',
          orderPublicId: order.publicId,
        }),
        failure: withQueryParam(cancelUrlBase, {
          cardCheckoutStatus: 'cancel',
          orderPublicId: order.publicId,
        }),
        pending: withQueryParam(successUrlBase, {
          cardCheckoutStatus: 'pending',
          orderPublicId: order.publicId,
        }),
      },
    };

    const response = await preferenceApi.create({
      body: preferenceBody,
    });

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

const asaasCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ payload, order, successUrlBase }) {
    const asaasBaseUrl = resolveAsaasBaseUrl();
    const accessToken = await getAsaasAccessToken(order.restaurantId);
    const savedMethodId = String(payload.paymentMethodId || '').trim();

    if (savedMethodId) {
      const userId = Number(payload.userId || 0);
      if (!userId) throw new Error('Entre na sua conta para pagar com um cartão salvo.');
      const savedMethod = await withTenantDbContext(order.restaurantId, (db) =>
        db.customerPaymentMethod.findFirst({
          where: {
            publicId: savedMethodId,
            userId,
            restaurantId: order.restaurantId,
            provider: 'ASAAS',
            active: true,
          },
        }),
      );
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
          getAsaasError(
            paymentResult.responseBody,
            'O Asaas recusou o pagamento com o cartão salvo.',
          ),
        );
      }

      const sessionId = String(paymentResult.responseBody?.id || '').trim();
      const status = String(paymentResult.responseBody?.status || '')
        .trim()
        .toUpperCase();
      if (!sessionId) throw new Error('O Asaas não retornou a identificação do pagamento.');
      const paymentApproved =
        ['CONFIRMED', 'RECEIVED'].includes(status) &&
        String(paymentResult.responseBody?.billingType || '').toUpperCase() === 'CREDIT_CARD' &&
        String(paymentResult.responseBody?.externalReference || '').trim() ===
          `ordercard:${order.id}:${order.restaurantId}` &&
        matchesOrderPaymentEvidence({
          expectedAmount: order.total,
          providerAmount: paymentResult.responseBody?.value,
          providerCurrency: 'BRL',
        });

      return {
        provider: CARD_PROVIDERS.ASAAS,
        sessionId,
        persistenceSessionId: `asaas_pay:${sessionId}`,
        checkoutUrl: withQueryParam(successUrlBase, {
          cardCheckoutStatus: paymentApproved ? 'success' : 'pending',
          orderPublicId: order.publicId,
        }),
        paymentApproved,
      };
    }

    const payerEmail = String(payload.userId ? '' : '').trim();
    const customerName = String(payload.customerName || 'Cliente').trim();
    const cpf = String(payload.customerCpf || '').replace(/\D/g, '');
    const normalizedEmail =
      String(payload.customerName || '').trim() && payload.customerCpf
        ? `guest.card.${order.restaurantId}.${Date.now()}@gastronexa.local`
        : `guest.card.${order.restaurantId}.${Date.now()}@gastronexa.local`;

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
    const paymentBody = {
      customer: customerId,
      billingType: 'UNDEFINED',
      value: Number(order.total || 0),
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Pedido #${order.id}`,
      externalReference: `ordercard:${order.id}:${order.restaurantId}`,
      callback: {
        successUrl: withQueryParam(successUrlBase, {
          cardCheckoutStatus: 'success',
          orderPublicId: order.publicId,
        }),
        autoRedirect: true,
      },
    };

    const paymentResult = await fetchAsaasJson<AsaasCardPaymentPayload>(
      `${asaasBaseUrl}/v3/payments`,
      accessToken,
      {
        method: 'POST',
        body: paymentBody,
      },
    );

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
    [CARD_PROVIDERS.MERCADO_PAGO]: mercadoPagoCardCheckoutProvider,
    [CARD_PROVIDERS.ASAAS]: asaasCardCheckoutProvider,
  };

export function getCardCheckoutProviderHandler(provider: CardProvider) {
  if (provider === CARD_PROVIDERS.ASAAS) assertFuturePaymentProviderEnabled('ASAAS');
  if (provider === CARD_PROVIDERS.PAGARME) assertFuturePaymentProviderEnabled('PAGARME');
  const handler = CARD_CHECKOUT_PROVIDER_HANDLERS[provider];

  if (!handler) {
    throw new Error(
      `Gateway de cartao ${provider} ainda nao integrado. Configure MERCADO_PAGO, PAGARME ou ASAAS para processar checkout com cartao no momento.`,
    );
  }

  return handler;
}
