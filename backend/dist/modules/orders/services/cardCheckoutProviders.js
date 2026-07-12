import Stripe from "stripe";
import { CARD_PROVIDERS } from "../../payments/providers/providerCatalog.js";
import { getMercadoPagoPreferenceApi } from "../../payments/providers/mercadoPagoClient.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";
function withQueryParam(baseUrl, params) {
    try {
        const nextUrl = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            nextUrl.searchParams.set(key, value);
        });
        return nextUrl.toString();
    }
    catch {
        return baseUrl;
    }
}
async function getStripeClient(restaurantId) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const settingsSecretKey = String(settings?.stripeSecretKey || "").trim();
    const globalSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
    const secretKey = settingsSecretKey || (allowGlobalFallback ? globalSecretKey : "");
    if (!secretKey) {
        throw new Error("Pagamento com cartao indisponivel. Configure chave secreta Stripe nas configuracoes do restaurante.");
    }
    return new Stripe(secretKey);
}
function resolveMercadoPagoNotificationUrl(restaurantId) {
    const explicitNotificationUrl = String(process.env.MP_NOTIFICATION_URL || "").trim();
    const backendUrl = String(process.env.BACKEND_URL || "")
        .trim()
        .replace(/\/+$/, "");
    const baseNotificationUrl = explicitNotificationUrl ||
        (backendUrl ? `${backendUrl}/orders/webhook/mercadopago` : "");
    if (!baseNotificationUrl || !restaurantId) {
        return baseNotificationUrl;
    }
    return withQueryParam(baseNotificationUrl, {
        restaurantId: String(restaurantId),
    });
}
function resolvePagBankEnvironment() {
    // Ambiente de checkout PagBank fixado em producao.
    return "production";
}
async function getPagBankCredentials(restaurantId) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const settingsEmail = String(settings?.pagbankEmail || "").trim();
    const settingsToken = String(settings?.pagbankToken || "").trim();
    const globalEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || "").trim();
    const globalToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || "").trim();
    const email = settingsEmail || (allowGlobalFallback ? globalEmail : "");
    const token = settingsToken || (allowGlobalFallback ? globalToken : "");
    const environment = resolvePagBankEnvironment();
    if (!email || !token) {
        throw new Error("Pagamento com cartao PagBank indisponivel. Configure email/token PagBank nas configuracoes do restaurante.");
    }
    return { email, token, environment };
}
function resolvePagBankCheckoutApiUrl(environment) {
    void environment;
    return "https://ws.pagseguro.uol.com.br/v2/checkout";
}
function resolvePagBankCheckoutPageBaseUrl(environment) {
    void environment;
    return "https://pagseguro.uol.com.br/v2/checkout/payment.html";
}
function applyPagBankPaymentMethodRestrictions(params) {
    // Keep checkout focused on digital methods used in the app flows.
    params.set("acceptedPaymentMethodGroup1", "CREDIT_CARD");
    params.set("excludePaymentMethodGroup1", "ONLINE_DEBIT");
}
function resolveAsaasBaseUrl() {
    return String(process.env.ASAAS_API_BASE_URL || "https://api.asaas.com")
        .trim()
        .replace(/\/+$/, "");
}
async function getAsaasAccessToken(restaurantId) {
    const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
    const settingsToken = String(settings?.asaasAccessToken || "").trim();
    const globalToken = String(process.env.ASAAS_API_KEY || "").trim();
    const accessToken = settingsToken || (allowGlobalFallback ? globalToken : "");
    if (!accessToken) {
        throw new Error("Pagamento com cartao Asaas indisponivel. Configure token Asaas nas configuracoes do restaurante.");
    }
    return accessToken;
}
function getAsaasError(payload, fallback) {
    if (!Array.isArray(payload?.errors) || payload.errors.length === 0) {
        return fallback;
    }
    const message = String(payload.errors[0]?.description || "").trim();
    if (message && /cpf\s+ou\s+cnpj/i.test(message)) {
        return "Nao foi possivel gerar o pagamento: informe um CPF/CNPJ valido do cliente ou use Mercado Pago.";
    }
    return message || fallback;
}
async function fetchAsaasJson(url, accessToken, { method = "GET", body, } = {}) {
    const response = await fetch(url, {
        method,
        headers: {
            "Content-Type": "application/json",
            access_token: accessToken,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const responseBody = (await response.json());
    return {
        ok: response.ok,
        responseBody,
    };
}
function resolvePagBankNotificationUrl(restaurantId) {
    const explicitNotificationUrl = String(process.env.PAGBANK_NOTIFICATION_URL || "").trim();
    const backendUrl = String(process.env.BACKEND_URL || "")
        .trim()
        .replace(/\/+$/, "");
    const baseNotificationUrl = explicitNotificationUrl ||
        (backendUrl ? `${backendUrl}/orders/webhook/pagbank` : "");
    if (!baseNotificationUrl || !restaurantId) {
        return baseNotificationUrl;
    }
    return withQueryParam(baseNotificationUrl, {
        restaurantId: String(restaurantId),
    });
}
function extractXmlTagValue(xml, tag) {
    const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
    const match = regex.exec(String(xml || ""));
    return String(match?.[1] || "").trim();
}
function extractProviderErrorText(error) {
    if (typeof error === "string") {
        return error.trim().toLowerCase();
    }
    const asRecord = typeof error === "object" && error !== null
        ? error
        : null;
    const message = String(asRecord?.message ||
        asRecord?.cause?.message ||
        "");
    const causeText = String(asRecord?.cause || "");
    return `${message} ${causeText}`.trim().toLowerCase();
}
function isMarketplaceSplitConfigurationError(error) {
    const text = extractProviderErrorText(error);
    if (!text) {
        return false;
    }
    return (text.includes("marketplace_fee") ||
        text.includes("application_fee") ||
        text.includes("marketplace") ||
        text.includes("split") ||
        text.includes("collector") ||
        text.includes("platform") ||
        text.includes("not allowed") ||
        text.includes("unauthorized") ||
        text.includes("invalid"));
}
const stripeCardCheckoutProvider = {
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
const mercadoPagoCardCheckoutProvider = {
    async createCheckout({ order, successUrlBase, cancelUrlBase }) {
        const preferenceApi = await getMercadoPagoPreferenceApi(order.restaurantId);
        const notificationUrl = resolveMercadoPagoNotificationUrl(order.restaurantId);
        const marketplaceFee = Number(order.systemFee || 0);
        const buildPreferenceBody = (includeMarketplaceFee) => ({
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
            ...(includeMarketplaceFee && marketplaceFee > 0
                ? { marketplace_fee: marketplaceFee }
                : {}),
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
        });
        let response;
        if (marketplaceFee > 0) {
            try {
                response = await preferenceApi.create({
                    body: buildPreferenceBody(true),
                });
            }
            catch (error) {
                if (!isMarketplaceSplitConfigurationError(error)) {
                    throw error;
                }
                console.warn("[CARD_SPLIT_FALLBACK] Mercado Pago rejeitou marketplace_fee. Recriando checkout sem split.", {
                    orderId: order.id,
                    restaurantId: order.restaurantId,
                    marketplaceFee,
                });
                response = await preferenceApi.create({
                    body: buildPreferenceBody(false),
                });
            }
        }
        else {
            response = await preferenceApi.create({
                body: buildPreferenceBody(false),
            });
        }
        const preference = typeof response === "object" && response !== null
            ? (response.body ?? response)
            : {};
        const preferenceId = String(preference.id || "").trim();
        const checkoutUrl = String(preference.init_point || "").trim();
        if (!preferenceId || !checkoutUrl) {
            throw new Error("Nao foi possivel criar checkout de cartao no Mercado Pago.");
        }
        return {
            provider: CARD_PROVIDERS.MERCADO_PAGO,
            sessionId: preferenceId,
            persistenceSessionId: `mp_pref:${preferenceId}`,
            checkoutUrl,
        };
    },
};
const pagBankCardCheckoutProvider = {
    async createCheckout({ order, successUrlBase }) {
        const { email, token, environment } = await getPagBankCredentials(order.restaurantId);
        const params = new URLSearchParams();
        params.set("email", email);
        params.set("token", token);
        params.set("currency", "BRL");
        params.set("itemId1", String(order.id));
        params.set("itemDescription1", `Pedido #${order.id}`);
        params.set("itemAmount1", Number(order.total || 0).toFixed(2));
        params.set("itemQuantity1", "1");
        params.set("reference", `ordercard:${order.id}:${order.restaurantId}`);
        applyPagBankPaymentMethodRestrictions(params);
        params.set("redirectURL", withQueryParam(successUrlBase, {
            cardCheckoutStatus: "success",
            orderId: String(order.id),
        }));
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
            const providerMessage = extractXmlTagValue(responseText, "message") ||
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
const asaasCardCheckoutProvider = {
    async createCheckout({ payload, order }) {
        const asaasBaseUrl = resolveAsaasBaseUrl();
        const accessToken = await getAsaasAccessToken(order.restaurantId);
        const payerEmail = String(payload.userId ? "" : "").trim();
        const customerName = String(payload.customerName || "Cliente").trim();
        const cpf = String(payload.customerCpf || "").replace(/\D/g, "");
        const normalizedEmail = String(payload.customerName || "").trim() && payload.customerCpf
            ? `guest.card.${order.restaurantId}.${Date.now()}@pecaja.local`
            : `guest.card.${order.restaurantId}.${Date.now()}@pecaja.local`;
        const customerResult = await fetchAsaasJson(`${asaasBaseUrl}/v3/customers`, accessToken, {
            method: "POST",
            body: {
                name: customerName || "Cliente",
                email: payerEmail || normalizedEmail,
                ...(cpf.length === 11 ? { cpfCnpj: cpf } : {}),
                ...(payload.customerPhone
                    ? {
                        mobilePhone: String(payload.customerPhone).replace(/\D/g, ""),
                    }
                    : {}),
            },
        });
        if (!customerResult.ok ||
            !String(customerResult.responseBody?.id || "").trim()) {
            throw new Error(getAsaasError(customerResult.responseBody, "Nao foi possivel criar/identificar cliente para checkout de cartao no Asaas."));
        }
        const customerId = String(customerResult.responseBody.id || "").trim();
        const settings = await restaurantSettingsRepository.findByRestaurantId(order.restaurantId);
        const walletId = String(settings?.gatewayMerchantId || "").trim();
        const platformWalletId = String(process.env.ASAAS_PLATFORM_WALLET_ID || "").trim();
        const systemFee = Number(order.systemFee || 0);
        const buildPaymentBody = (includeSplit) => ({
            customer: customerId,
            billingType: "CREDIT_CARD",
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
        let paymentResult = await fetchAsaasJson(`${asaasBaseUrl}/v3/payments`, accessToken, {
            method: "POST",
            body: buildPaymentBody(systemFee > 0),
        });
        const shouldRetryWithoutSplit = systemFee > 0 &&
            !paymentResult.ok &&
            isMarketplaceSplitConfigurationError(getAsaasError(paymentResult.responseBody, "Erro ao criar checkout de cartao no Asaas."));
        if (shouldRetryWithoutSplit) {
            console.warn("[ASAAS_CARD_SPLIT_FALLBACK] Asaas rejeitou split. Recriando checkout sem split.", {
                orderId: order.id,
                restaurantId: order.restaurantId,
                systemFee,
            });
            paymentResult = await fetchAsaasJson(`${asaasBaseUrl}/v3/payments`, accessToken, {
                method: "POST",
                body: buildPaymentBody(false),
            });
        }
        if (!paymentResult.ok) {
            throw new Error(getAsaasError(paymentResult.responseBody, "Nao foi possivel criar checkout de cartao no Asaas."));
        }
        const sessionId = String(paymentResult.responseBody?.id || "").trim();
        const checkoutUrl = String(paymentResult.responseBody?.invoiceUrl || "").trim();
        if (!sessionId || !checkoutUrl) {
            throw new Error("Asaas nao retornou link de checkout para pagamento com cartao.");
        }
        return {
            provider: CARD_PROVIDERS.ASAAS,
            sessionId,
            persistenceSessionId: `asaas_pay:${sessionId}`,
            checkoutUrl,
        };
    },
};
const CARD_CHECKOUT_PROVIDER_HANDLERS = {
    [CARD_PROVIDERS.STRIPE]: stripeCardCheckoutProvider,
    [CARD_PROVIDERS.MERCADO_PAGO]: mercadoPagoCardCheckoutProvider,
    [CARD_PROVIDERS.PAGBANK]: pagBankCardCheckoutProvider,
    [CARD_PROVIDERS.ASAAS]: asaasCardCheckoutProvider,
};
export function getCardCheckoutProviderHandler(provider) {
    const handler = CARD_CHECKOUT_PROVIDER_HANDLERS[provider];
    if (!handler) {
        throw new Error(`Gateway de cartao ${provider} ainda nao integrado. Configure STRIPE, MERCADO_PAGO, PAGBANK ou ASAAS para processar checkout com cartao no momento.`);
    }
    return handler;
}
