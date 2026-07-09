import Stripe from "stripe";
import type { OrderType, PaymentMethod } from "@prisma/client";
import type { CardProvider } from "../../payments/providers/providerCatalog.js";
import { CARD_PROVIDERS } from "../../payments/providers/providerCatalog.js";
import { getMercadoPagoPreferenceApi } from "../../payments/providers/mercadoPagoClient.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";

type CheckoutOrder = {
  id: number;
  restaurantId: number;
  total: number | string | { toString(): string } | null;
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
};

export type CardCheckoutResult = {
  provider: CardProvider;
  sessionId: string;
  checkoutUrl: string;
  persistenceSessionId?: string;
};

type CardCheckoutProviderContext = {
  payload: CreateOrderCardCheckoutPayload;
  order: CheckoutOrder;
  successUrlBase: string;
  cancelUrlBase: string;
};

export type CardCheckoutProviderHandler = {
  createCheckout(
    context: CardCheckoutProviderContext,
  ): Promise<CardCheckoutResult>;
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
  const allowGlobalFallback =
    process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings =
    await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const settingsSecretKey = String(settings?.stripeSecretKey || "").trim();
  const globalSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const secretKey =
    settingsSecretKey || (allowGlobalFallback ? globalSecretKey : "");

  if (!secretKey) {
    throw new Error(
      "Pagamento com cartao indisponivel. Configure chave secreta Stripe nas configuracoes do restaurante.",
    );
  }

  return new Stripe(secretKey);
}

function resolveMercadoPagoNotificationUrl(restaurantId?: number) {
  const explicitNotificationUrl = String(
    process.env.MP_NOTIFICATION_URL || "",
  ).trim();

  const backendUrl = String(process.env.BACKEND_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const baseNotificationUrl =
    explicitNotificationUrl ||
    (backendUrl ? `${backendUrl}/orders/webhook/mercadopago` : "");

  if (!baseNotificationUrl || !restaurantId) {
    return baseNotificationUrl;
  }

  return withQueryParam(baseNotificationUrl, {
    restaurantId: String(restaurantId),
  });
}

type PagBankCredentials = {
  email: string;
  token: string;
  environment: "production";
};

function resolvePagBankEnvironment(): "production" {
  // Ambiente de checkout PagBank fixado em producao.
  return "production";
}

async function getPagBankCredentials(
  restaurantId: number,
): Promise<PagBankCredentials> {
  const allowGlobalFallback =
    process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
  const settings =
    await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  const settingsEmail = String(settings?.pagbankEmail || "").trim();
  const settingsToken = String(settings?.pagbankToken || "").trim();
  const globalEmail = String(
    process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || "",
  ).trim();
  const globalToken = String(
    process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || "",
  ).trim();
  const email = settingsEmail || (allowGlobalFallback ? globalEmail : "");
  const token = settingsToken || (allowGlobalFallback ? globalToken : "");
  const environment = resolvePagBankEnvironment();

  if (!email || !token) {
    throw new Error(
      "Pagamento com cartao PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante.",
    );
  }

  return { email, token, environment };
}

function resolvePagBankCheckoutApiUrl(environment: "production") {
  void environment;
  return "https://ws.pagseguro.uol.com.br/v2/checkout";
}

function resolvePagBankCheckoutPageBaseUrl(environment: "production") {
  void environment;
  return "https://pagseguro.uol.com.br/v2/checkout/payment.html";
}

function resolvePagBankNotificationUrl(restaurantId?: number) {
  const explicitNotificationUrl = String(
    process.env.PAGBANK_NOTIFICATION_URL || "",
  ).trim();

  const backendUrl = String(process.env.BACKEND_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const baseNotificationUrl =
    explicitNotificationUrl ||
    (backendUrl ? `${backendUrl}/orders/webhook/pagbank` : "");

  if (!baseNotificationUrl || !restaurantId) {
    return baseNotificationUrl;
  }

  return withQueryParam(baseNotificationUrl, {
    restaurantId: String(restaurantId),
  });
}

function extractXmlTagValue(xml: string, tag: string) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
  const match = regex.exec(String(xml || ""));

  return String(match?.[1] || "").trim();
}

const stripeCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ order, successUrlBase, cancelUrlBase }) {
    const stripe = await getStripeClient(order.restaurantId);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: Math.round(Number(order.total || 0) * 100),
            product_data: {
              name: `Pedido #${order.id}`,
              description: order.restaurant?.name || "Pedido online",
            },
          },
        },
      ],
      metadata: {
        orderId: String(order.id),
        restaurantId: String(order.restaurantId),
      },
      success_url: withQueryParam(successUrlBase, {
        cardCheckoutStatus: "success",
        orderId: String(order.id),
      }),
      cancel_url: withQueryParam(cancelUrlBase, {
        cardCheckoutStatus: "cancel",
        orderId: String(order.id),
      }),
    });

    return {
      provider: CARD_PROVIDERS.STRIPE,
      sessionId: String(session.id),
      checkoutUrl: String(session.url || ""),
    };
  },
};

const mercadoPagoCardCheckoutProvider: CardCheckoutProviderHandler = {
  async createCheckout({ order, successUrlBase, cancelUrlBase }) {
    const preferenceApi = await getMercadoPagoPreferenceApi(order.restaurantId);
    const notificationUrl = resolveMercadoPagoNotificationUrl(
      order.restaurantId,
    );

    const response = (await preferenceApi.create({
      body: {
        items: [
          {
            id: String(order.id),
            title: `Pedido #${order.id}`,
            description: order.restaurant?.name || "Pedido online",
            quantity: 1,
            currency_id: "BRL",
            unit_price: Number(order.total || 0),
          },
        ],
        external_reference: `ordercard:${order.id}:${order.restaurantId}`,
        metadata: {
          order_id: String(order.id),
          restaurant_id: String(order.restaurantId),
          source: "order_card_checkout",
        },
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        back_urls: {
          success: withQueryParam(successUrlBase, {
            cardCheckoutStatus: "success",
            orderId: String(order.id),
          }),
          failure: withQueryParam(cancelUrlBase, {
            cardCheckoutStatus: "cancel",
            orderId: String(order.id),
          }),
          pending: withQueryParam(successUrlBase, {
            cardCheckoutStatus: "pending",
            orderId: String(order.id),
          }),
        },
      },
    })) as unknown;

    const preference =
      typeof response === "object" && response !== null
        ? ((response as { body?: unknown }).body ?? response)
        : {};
    const preferenceId = String(
      (preference as { id?: unknown }).id || "",
    ).trim();
    const checkoutUrl = String(
      (preference as { init_point?: unknown }).init_point || "",
    ).trim();

    if (!preferenceId || !checkoutUrl) {
      throw new Error(
        "Nao foi possivel criar checkout de cartao no Mercado Pago.",
      );
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
  async createCheckout({ order, successUrlBase }) {
    const { email, token, environment } = await getPagBankCredentials(
      order.restaurantId,
    );

    const params = new URLSearchParams();
    params.set("email", email);
    params.set("token", token);
    params.set("currency", "BRL");
    params.set("itemId1", String(order.id));
    params.set("itemDescription1", `Pedido #${order.id}`);
    params.set("itemAmount1", Number(order.total || 0).toFixed(2));
    params.set("itemQuantity1", "1");
    params.set("reference", `ordercard:${order.id}:${order.restaurantId}`);
    params.set(
      "redirectURL",
      withQueryParam(successUrlBase, {
        cardCheckoutStatus: "success",
        orderId: String(order.id),
      }),
    );

    const notificationUrl = resolvePagBankNotificationUrl(order.restaurantId);
    if (notificationUrl) {
      params.set("notificationURL", notificationUrl);
    }

    const response = await fetch(resolvePagBankCheckoutApiUrl(environment), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: params.toString(),
    });

    const responseText = await response.text();
    if (!response.ok) {
      const providerMessage =
        extractXmlTagValue(responseText, "message") ||
        extractXmlTagValue(responseText, "error") ||
        "Falha ao criar checkout no PagBank.";
      throw new Error(`PagBank: ${providerMessage}`);
    }

    const checkoutCode = extractXmlTagValue(responseText, "code");
    if (!checkoutCode) {
      throw new Error("PagBank nao retornou codigo de checkout.");
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

const CARD_CHECKOUT_PROVIDER_HANDLERS: Partial<
  Record<CardProvider, CardCheckoutProviderHandler>
> = {
  [CARD_PROVIDERS.STRIPE]: stripeCardCheckoutProvider,
  [CARD_PROVIDERS.MERCADO_PAGO]: mercadoPagoCardCheckoutProvider,
  [CARD_PROVIDERS.PAGBANK]: pagBankCardCheckoutProvider,
};

export function getCardCheckoutProviderHandler(provider: CardProvider) {
  const handler = CARD_CHECKOUT_PROVIDER_HANDLERS[provider];

  if (!handler) {
    throw new Error(
      `Gateway de cartao ${provider} ainda nao integrado. Configure STRIPE, MERCADO_PAGO ou PAGBANK para processar checkout com cartao no momento.`,
    );
  }

  return handler;
}
