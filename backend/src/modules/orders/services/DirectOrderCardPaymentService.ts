import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import {
  getMercadoPagoAccessToken,
  getPagBankAccessToken,
} from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import { pagBankApiBaseUrl } from '../../payments/providers/pagBankCheckout.js';
import type { CardProvider } from '../../payments/providers/providerCatalog.js';
import { CARD_PROVIDERS } from '../../payments/providers/providerCatalog.js';
import { matchesOrderPaymentEvidence } from '../utils/paymentEvidence.js';
import { normalizeMercadoPagoPaymentMethodId } from '../../customerPaymentMethods/domain/cardBrand.js';
import { mercadoPagoCardExternalReference } from '../domain/mercadoPagoCardReference.js';

export type DirectCardPaymentPayload = {
  cardToken?: string | null;
  cardPaymentMethodId?: string | null;
  encryptedCard?: string | null;
  cardData?: {
    number?: string | null;
    securityCode?: string | null;
  } | null;
  holderName?: string | null;
  holderTaxId?: string | null;
  payerEmail?: string | null;
  mercadoPagoDeviceId?: string | null;
  expMonth?: number | string | null;
  expYear?: number | string | null;
  billingPostalCode?: string | null;
  billingAddressNumber?: string | null;
};

type CardOrder = {
  id: number;
  publicId: string;
  restaurantId: number;
  total: number | string | { toString(): string } | null;
  systemFee?: number | string | { toString(): string } | null;
  restaurant?: { name?: string | null } | null;
};

type BasePayload = DirectCardPaymentPayload & {
  userId?: number | string | null;
  paymentMethodId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerIp?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
};

export type CardPaymentProviderDiagnostic = {
  provider: 'MERCADO_PAGO';
  httpStatus: number;
  providerCode: string | null;
  status: string | null;
  statusDetail: string | null;
  providerRequestId: string | null;
};

export class CardPaymentDeclinedError extends Error {
  constructor(
    message = 'O cartão não foi autorizado. Revise os dados ou use outro cartão.',
    public readonly diagnostic?: CardPaymentProviderDiagnostic,
  ) {
    super(message);
    this.name = 'CardPaymentDeclinedError';
  }
}

export class CardPaymentProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly providerStatus: number,
    public readonly providerCode: string,
    public readonly diagnostic?: CardPaymentProviderDiagnostic,
  ) {
    super(message);
    this.name = 'CardPaymentProviderRequestError';
  }
}

function digits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function isValidPayerEmail(value: string) {
  if (value.length < 3 || value.length > 254 || /\s/u.test(value)) return false;

  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@') || at > 64 || at >= value.length - 1) return false;

  const domain = value.slice(at + 1);
  const dot = domain.indexOf('.');
  return dot > 0 && dot < domain.length - 1;
}

function amount(value: unknown) {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error('Valor inválido para pagamento com cartão.');
  }
  return Number(normalized.toFixed(2));
}

function internalReturnUrl(baseUrl: string, order: CardOrder, status: 'success' | 'pending') {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('cardCheckoutStatus', status);
    url.searchParams.set('orderPublicId', order.publicId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

function providerErrorItems(body: Record<string, unknown>) {
  if (Array.isArray(body.cause)) return body.cause;
  if (Array.isArray(body.error_messages)) return body.error_messages;
  if (Array.isArray(body.errors)) return body.errors;
  return [];
}

function providerErrorCode(body: Record<string, unknown>) {
  const first = providerErrorItems(body)[0] as { code?: unknown } | undefined;
  return String(first?.code || body.code || body.error || '')
    .trim()
    .toLowerCase();
}

function safeProviderMessage(body: Record<string, unknown>, fallback: string) {
  const first = providerErrorItems(body)[0] as
    { description?: unknown; message?: unknown; code?: unknown } | undefined;
  return String(first?.description || first?.message || body.message || fallback)
    .replace(/\b\d{13,19}\b/g, '[cartão protegido]')
    .replace(/(?:APP_USR|TEST)-[A-Za-z0-9_-]+/g, '[credencial protegida]')
    .slice(0, 220);
}

export function mercadoPagoDeclineDetails(body: Record<string, unknown>) {
  const data =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : body;
  const transactions =
    data.transactions && typeof data.transactions === 'object'
      ? (data.transactions as Record<string, unknown>)
      : null;
  const payments = Array.isArray(transactions?.payments) ? transactions?.payments : [];
  const payment =
    payments[0] && typeof payments[0] === 'object'
      ? (payments[0] as Record<string, unknown>)
      : null;

  const errors = providerErrorItems(body);
  const firstError =
    errors[0] && typeof errors[0] === 'object'
      ? (errors[0] as Record<string, unknown>)
      : null;
  const errorDetails = Array.isArray(firstError?.details) ? firstError?.details : [];
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

async function readResponse(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function mercadoPagoDiagnostic(
  response: Response,
  body: Record<string, unknown>,
): CardPaymentProviderDiagnostic {
  const decline = mercadoPagoDeclineDetails(body);
  const providerCode = providerErrorCode(body);
  const providerRequestId = String(response.headers.get('x-request-id') || '')
    .trim()
    .slice(0, 160);

  return {
    provider: 'MERCADO_PAGO',
    httpStatus: response.status,
    providerCode: providerCode || null,
    status: decline.transactionStatus,
    statusDetail: decline.transactionStatusDetail,
    providerRequestId: providerRequestId || null,
  };
}

async function payerEmail(payload: BasePayload, order: CardOrder) {
  const suppliedEmail = String(payload.payerEmail || '').trim().toLowerCase();
  if (isValidPayerEmail(suppliedEmail)) return suppliedEmail;

  const userId = Number(payload.userId || 0);
  if (Number.isSafeInteger(userId) && userId > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const email = String(user?.email || '').trim();
    if (email.includes('@')) return email;
  }
  return `guest.card.${order.restaurantId}.${order.id}@gastronexa.local`;
}

async function savedMethod(payload: BasePayload, order: CardOrder, provider: CardProvider) {
  const publicId = String(payload.paymentMethodId || '').trim();
  if (!publicId) return null;
  const userId = Number(payload.userId || 0);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new CardPaymentDeclinedError('Entre na sua conta para usar um cartão salvo.');
  }
  return withTenantDbContext(order.restaurantId, (db) =>
    db.customerPaymentMethod.findFirst({
      where: {
        publicId,
        userId,
        restaurantId: order.restaurantId,
        provider,
        active: true,
      },
    }),
  );
}

async function mercadoPagoPayment(payload: BasePayload, order: CardOrder, successUrlBase: string) {
  const token = String(payload.cardToken || '').trim();
  if (!token) throw new CardPaymentDeclinedError('Informe os dados do cartão para continuar.');

  const stored = await savedMethod(payload, order, CARD_PROVIDERS.MERCADO_PAGO);
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
  const reference = mercadoPagoCardExternalReference(order.id, order.restaurantId);
  const storedCustomerId = String(stored?.providerCustomerId || '').trim();

  if (stored && !storedCustomerId) {
    throw new CardPaymentDeclinedError(
      'Este cartão salvo precisa ser cadastrado novamente antes do pagamento.',
    );
  }

  const payer = stored
    ? { customer_id: storedCustomerId }
    : { email: await payerEmail(payload, order) };

  const body = {
    type: 'online',
    processing_mode: 'automatic',
    total_amount: total.toFixed(2),
    external_reference: reference,
    description: `Pedido #${order.id}`,
    payer,
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

  const send = async () => {
    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `order-card-${order.restaurantId}-${order.id}`,
        ...(String(payload.mercadoPagoDeviceId || '').trim()
          ? { 'X-meli-session-id': String(payload.mercadoPagoDeviceId).trim().slice(0, 256) }
          : {}),
      },
      body: JSON.stringify(body),
    });
    const responseBody = await readResponse(response);
    return { response, body: responseBody };
  };

  const result = await send();
  if (!result.response.ok) {
    if (isMercadoPagoRequestValidationError(result.response.status, result.body)) {
      const diagnostic = mercadoPagoDiagnostic(result.response, result.body);
      const providerCode = diagnostic.providerCode || 'invalid_request';
      const providerMessage = safeProviderMessage(
        result.body,
        'O Mercado Pago rejeitou os dados enviados pelo checkout.',
      );
      console.error('[MERCADO_PAGO_CARD_REQUEST_INVALID]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
        providerStatus: diagnostic.httpStatus,
        providerCode,
        providerMessage,
        transactionStatus: diagnostic.status,
        transactionStatusDetail: diagnostic.statusDetail,
        providerRequestId: diagnostic.providerRequestId,
      });
      throw new CardPaymentProviderRequestError(
        'Não foi possível processar o cartão neste momento.',
        result.response.status,
        providerCode,
        diagnostic,
      );
    }
    if (result.response.status === 402) {
      const diagnostic = mercadoPagoDiagnostic(result.response, result.body);
      console.warn('[MERCADO_PAGO_CARD_PAYMENT_FAILED]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
        providerStatus: diagnostic.httpStatus,
        providerCode: diagnostic.providerCode || 'card_payment_failed',
        transactionStatus: diagnostic.status,
        transactionStatusDetail: diagnostic.statusDetail,
        providerRequestId: diagnostic.providerRequestId,
      });
      throw new CardPaymentDeclinedError(
        safeProviderMessage(result.body, 'O Mercado Pago não autorizou este cartão.'),
        diagnostic,
      );
    }
    if (result.response.status >= 400 && result.response.status < 500) {
      const diagnostic = mercadoPagoDiagnostic(result.response, result.body);
      throw new CardPaymentProviderRequestError(
        'Não foi possível processar o cartão neste momento.',
        result.response.status,
        diagnostic.providerCode || 'provider_request_error',
        diagnostic,
      );
    }
    throw new Error('Falha temporária ao processar o cartão no Mercado Pago.');
  }

  const providerOrderId = String(result.body.id || '').trim();
  const status = String(result.body.status || '')
    .trim()
    .toLowerCase();
  if (!providerOrderId) throw new Error('Mercado Pago não retornou a identificação da cobrança.');
  const approved = status === 'processed';

  return {
    provider: CARD_PROVIDERS.MERCADO_PAGO,
    sessionId: providerOrderId,
    persistenceSessionId: `mp_order:${providerOrderId}`,
    checkoutUrl: internalReturnUrl(successUrlBase, order, approved ? 'success' : 'pending'),
    paymentApproved: approved,
  } as const;
}

async function pagBankPayment(payload: BasePayload, order: CardOrder, successUrlBase: string) {
  const encryptedCard = String(payload.encryptedCard || '').trim();
  if (!encryptedCard)
    throw new CardPaymentDeclinedError('Informe os dados do cartão para continuar.');
  const token = await getPagBankAccessToken(order.restaurantId);
  const totalCents = Math.round(amount(order.total) * 100);
  const reference = `ordercard:${order.id}:${order.restaurantId}`;
  const taxId = digits(payload.holderTaxId);
  const email = await payerEmail(payload, order);
  const backendUrl = String(process.env.BACKEND_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const notificationUrl = backendUrl
    ? `${backendUrl}/orders/webhook/pagbank?restaurantId=${order.restaurantId}`
    : '';

  const response = await fetch(`${pagBankApiBaseUrl()}/orders`, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-idempotency-key': `order-card-${order.restaurantId}-${order.id}`,
    },
    body: JSON.stringify({
      reference_id: reference,
      customer: {
        name: String(payload.customerName || payload.holderName || 'Cliente').trim(),
        email,
        ...(taxId ? { tax_id: taxId } : {}),
      },
      items: [
        {
          reference_id: String(order.id),
          name: `Pedido #${order.id}`,
          quantity: 1,
          unit_amount: totalCents,
        },
      ],
      charges: [
        {
          reference_id: reference,
          description: `Pedido #${order.id}`,
          amount: { value: totalCents, currency: 'BRL' },
          payment_method: {
            type: 'CREDIT_CARD',
            installments: 1,
            capture: true,
            card: { encrypted: encryptedCard },
            holder: {
              name: String(payload.holderName || payload.customerName || 'Cliente').trim(),
              ...(taxId ? { tax_id: taxId } : {}),
            },
          },
        },
      ],
      ...(notificationUrl ? { notification_urls: [notificationUrl] } : {}),
    }),
  });
  const body = await readResponse(response);
  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new CardPaymentDeclinedError(
        safeProviderMessage(body, 'O PagBank não autorizou este cartão.'),
      );
    }
    throw new Error('Falha temporária ao processar o cartão no PagBank.');
  }

  const charges = Array.isArray(body.charges) ? body.charges : [];
  const charge = (charges[0] || {}) as Record<string, unknown>;
  const chargeId = String(charge.id || '').trim();
  const status = String(charge.status || '')
    .trim()
    .toUpperCase();
  const chargeAmount =
    typeof charge.amount === 'object' && charge.amount !== null
      ? (charge.amount as Record<string, unknown>)
      : {};
  const paymentMethod =
    typeof charge.payment_method === 'object' && charge.payment_method !== null
      ? (charge.payment_method as Record<string, unknown>)
      : {};
  if (!/^CHAR_[\w-]+$/.test(chargeId)) {
    throw new Error('PagBank não retornou a identificação da cobrança.');
  }
  if (['DECLINED', 'CANCELED', 'CANCELLED'].includes(status)) {
    throw new CardPaymentDeclinedError('O PagBank não autorizou este cartão.');
  }
  const approved =
    status === 'PAID' &&
    String(body.reference_id || '').trim() === reference &&
    String(charge.reference_id || '').trim() === reference &&
    String(paymentMethod.type || '').toUpperCase() === 'CREDIT_CARD' &&
    matchesOrderPaymentEvidence({
      expectedAmount: order.total,
      providerAmount: chargeAmount.value,
      providerAmountUnit: 'MINOR',
      providerCurrency: chargeAmount.currency,
    });

  return {
    provider: CARD_PROVIDERS.PAGBANK,
    sessionId: chargeId,
    persistenceSessionId: `pagbank_tx:${chargeId}`,
    checkoutUrl: internalReturnUrl(successUrlBase, order, approved ? 'success' : 'pending'),
    paymentApproved: approved,
  } as const;
}

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

async function asaasPayment(payload: BasePayload, order: CardOrder, successUrlBase: string) {
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
  if (!accessToken) throw new Error('Pagamento com cartão indisponível no momento.');
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
  if (!customerId) throw new Error('Asaas não retornou a identificação do cliente.');

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
  };

  const paymentResult = await asaasJson(
    `${baseUrl}/v3/payments`,
    accessToken,
    paymentBody,
  );
  if (!paymentResult.response.ok) {
    if (paymentResult.response.status >= 400 && paymentResult.response.status < 500) {
      throw new CardPaymentDeclinedError(
        safeProviderMessage(paymentResult.body, 'O Asaas não autorizou este cartão.'),
      );
    }
    throw new Error('Falha temporária ao processar o cartão no Asaas.');
  }

  const paymentId = String(paymentResult.body.id || '').trim();
  const status = String(paymentResult.body.status || '')
    .trim()
    .toUpperCase();
  if (!paymentId) throw new Error('Asaas não retornou a identificação da cobrança.');
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
    provider: CARD_PROVIDERS.ASAAS,
    sessionId: paymentId,
    persistenceSessionId: `asaas_pay:${paymentId}`,
    checkoutUrl: internalReturnUrl(successUrlBase, order, approved ? 'success' : 'pending'),
    paymentApproved: approved,
  } as const;
}

export function hasDirectCardPaymentPayload(payload: DirectCardPaymentPayload) {
  return Boolean(
    String(payload.cardToken || '').trim() ||
    String(payload.encryptedCard || '').trim() ||
    digits(payload.cardData?.number),
  );
}

class DirectOrderCardPaymentService {
  async execute(input: {
    provider: CardProvider;
    payload: BasePayload;
    order: CardOrder;
    successUrlBase: string;
  }) {
    if (input.provider === CARD_PROVIDERS.MERCADO_PAGO) {
      return mercadoPagoPayment(input.payload, input.order, input.successUrlBase);
    }
    if (input.provider === CARD_PROVIDERS.PAGBANK) {
      return pagBankPayment(input.payload, input.order, input.successUrlBase);
    }
    if (input.provider === CARD_PROVIDERS.ASAAS) {
      return asaasPayment(input.payload, input.order, input.successUrlBase);
    }
    throw new CardPaymentDeclinedError('Este provedor não aceita checkout transparente de cartão.');
  }
}

export default new DirectOrderCardPaymentService();
