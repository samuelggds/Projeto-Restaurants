import crypto from 'node:crypto';
import { load } from 'cheerio';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoPreferenceApi } from '../../payments/providers/mercadoPagoClient.js';
import {
  CARD_PROVIDERS,
  PIX_PROVIDERS,
  type CardProvider,
  type PixProvider,
} from '../../payments/providers/providerCatalog.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import type {
  CreateProviderPaymentInput,
  PaymentProvider,
  ProviderMutationInput,
  ProviderPayment,
  ProviderWebhookInput,
  ValidatedPaymentWebhook,
} from './PaymentProvider.js';

const SUPPORTED_PIX = new Set<string>([
  PIX_PROVIDERS.MERCADO_PAGO,
  PIX_PROVIDERS.ASAAS,
  PIX_PROVIDERS.PAGBANK,
]);
const SUPPORTED_CARD = new Set<string>([
  CARD_PROVIDERS.MERCADO_PAGO,
  CARD_PROVIDERS.ASAAS,
  CARD_PROVIDERS.PAGBANK,
]);
const PAID_STATUSES = new Set(['PAID', 'APPROVED', 'ACCREDITED', 'RECEIVED', 'CONFIRMED']);
const FAILED_STATUSES = new Set(['FAILED', 'DECLINED', 'REJECTED', 'CANCELED', 'CANCELLED']);
const EXPIRED_STATUSES = new Set(['EXPIRED', 'OVERDUE']);
const REFUNDED_STATUSES = new Set(['REFUNDED', 'CHARGED_BACK', 'CHARGEDBACK']);

export type TableOnlinePaymentReadiness = {
  allowPix: boolean;
  allowCard: boolean;
  pixProvider: PixProvider | null;
  cardProvider: CardProvider | null;
};

type ProviderFactoryContext = {
  restaurantId: number;
  participantId: number;
  participantUserId: number | null;
  participantName: string | null;
  participantPhone: string | null;
  intentPublicId: string;
  method: 'PIX' | 'CARD';
  paymentMethodId?: string | null;
};

type CustomerIdentity = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
};

type AsaasPayload = {
  id?: string;
  status?: string;
  value?: number;
  billingType?: string;
  externalReference?: string;
  invoiceUrl?: string;
  payload?: string;
  encodedImage?: string;
  errors?: Array<{ description?: string }>;
};

type PagBankChargePayload = {
  id?: string;
  status?: string;
  reference_id?: string;
  amount?: { value?: number; currency?: string };
  payment_method?: { type?: string };
  error_messages?: Array<{ description?: string }>;
};

type PagBankOrderPayload = {
  id?: string;
  reference_id?: string;
  qr_codes?: Array<{ text?: string }>;
  charges?: PagBankChargePayload[];
  error_messages?: Array<{ description?: string }>;
};

type MercadoPagoPaymentPayload = {
  id?: string | number;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string };
  };
};

type MercadoPagoSearchPayload = {
  results?: MercadoPagoPaymentPayload[];
};

function normalizeProvider(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function safeMoneyAmount(cents: number) {
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Valor do pagamento inválido.');
  return Number((cents / 100).toFixed(2));
}

function normalizedDigits(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function tableReference(context: ProviderFactoryContext) {
  return `tablepay:${context.restaurantId}:${context.intentPublicId}`;
}

function providerStatus(status: unknown) {
  const normalized = String(status || '').trim().toUpperCase();
  if (PAID_STATUSES.has(normalized)) return 'PAID' as const;
  if (REFUNDED_STATUSES.has(normalized)) return 'REFUNDED' as const;
  if (EXPIRED_STATUSES.has(normalized)) return 'EXPIRED' as const;
  if (FAILED_STATUSES.has(normalized)) return 'FAILED' as const;
  return 'PENDING' as const;
}

function isAmountMatch(providerAmount: unknown, expectedCents: number, unit: 'MAJOR' | 'MINOR' = 'MAJOR') {
  const numeric = Number(providerAmount);
  if (!Number.isFinite(numeric)) return false;
  const cents = unit === 'MINOR' ? Math.round(numeric) : Math.round((numeric + Number.EPSILON) * 100);
  return cents === expectedCents;
}

async function customerIdentity(context: ProviderFactoryContext): Promise<CustomerIdentity> {
  const user = context.participantUserId
    ? await prisma.user.findFirst({
        where: { id: context.participantUserId, role: 'CLIENTE', active: true },
        select: { name: true, email: true, cpf: true, phone: true },
      })
    : null;
  const name = String(user?.name || context.participantName || 'Cliente da mesa').trim();
  const email = String(user?.email || '').trim();
  return {
    name: name || 'Cliente da mesa',
    email: email.includes('@')
      ? email
      : `guest.table.${context.restaurantId}.${context.participantId}@pecaja.local`,
    cpf: normalizedDigits(user?.cpf),
    phone: normalizedDigits(user?.phone || context.participantPhone),
  };
}

async function readSettings(restaurantId: number) {
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  if (!settings) throw new Error('Configurações de pagamento do restaurante não encontradas.');
  return settings;
}

function credentialReady(settings: Awaited<ReturnType<typeof readSettings>>, provider: string) {
  if (provider === PIX_PROVIDERS.MERCADO_PAGO || provider === CARD_PROVIDERS.MERCADO_PAGO) {
    return Boolean(String(settings.mercadoPagoAccessToken || '').trim());
  }
  if (provider === PIX_PROVIDERS.ASAAS || provider === CARD_PROVIDERS.ASAAS) {
    return Boolean(String(settings.asaasAccessToken || '').trim());
  }
  if (provider === PIX_PROVIDERS.PAGBANK) {
    return Boolean(String(settings.pagbankToken || '').trim());
  }
  if (provider === CARD_PROVIDERS.PAGBANK) {
    return Boolean(
      String(settings.pagbankToken || '').trim() && String(settings.pagbankEmail || '').trim(),
    );
  }
  return false;
}

export async function getConfiguredTablePaymentReadiness(
  restaurantId: number,
): Promise<TableOnlinePaymentReadiness> {
  const settings = await readSettings(restaurantId);
  const pixProviderRaw = normalizeProvider(settings.pixProvider);
  const cardProviderRaw = normalizeProvider(settings.cardGateway);
  const pixProvider = SUPPORTED_PIX.has(pixProviderRaw) ? (pixProviderRaw as PixProvider) : null;
  const cardProvider = SUPPORTED_CARD.has(cardProviderRaw) ? (cardProviderRaw as CardProvider) : null;
  const allowPix = Boolean(
    settings.acceptsPix &&
      pixProvider &&
      String(settings.pixKey || '').trim() &&
      credentialReady(settings, pixProvider),
  );
  const allowCard = Boolean(
    settings.acceptsCard && cardProvider && credentialReady(settings, cardProvider),
  );
  return { allowPix, allowCard, pixProvider, cardProvider };
}

async function getSavedMethod(context: ProviderFactoryContext, provider: string) {
  const paymentMethodId = String(context.paymentMethodId || '').trim();
  if (!paymentMethodId) return null;
  if (!context.participantUserId) throw new Error('Entre na sua conta para usar um cartão salvo.');
  const method = await withTenantDbContext(context.restaurantId, (db) =>
    db.customerPaymentMethod.findFirst({
      where: {
        publicId: paymentMethodId,
        userId: context.participantUserId || undefined,
        restaurantId: context.restaurantId,
        provider,
        active: true,
      },
    }),
  );
  if (!method) throw new Error('O cartão salvo não pertence a este cliente ou a este restaurante.');
  return method;
}

function pagBankApiBase() {
  return String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com')
    .trim()
    .replace(/\/+$/, '');
}

function asaasApiBase() {
  return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
    .trim()
    .replace(/\/+$/, '');
}

async function fetchJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T;
  return { response, body };
}

function firstProviderError(payload: { errors?: Array<{ description?: string }>; error_messages?: Array<{ description?: string }> }, fallback: string) {
  return String(payload.errors?.[0]?.description || payload.error_messages?.[0]?.description || fallback).trim();
}

async function createMercadoPagoPix(
  context: ProviderFactoryContext,
  input: CreateProviderPaymentInput,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const accessToken = String(settings.mercadoPagoAccessToken || '').trim();
  if (!accessToken) throw new Error('Mercado Pago não configurado para este restaurante.');
  const identity = await customerIdentity(context);
  const paymentApi = new Payment(new MercadoPagoConfig({ accessToken }));
  const amount = safeMoneyAmount(input.amountCents);
  const body = {
    transaction_amount: amount,
    description: 'Conta da mesa',
    payment_method_id: 'pix',
    payer: {
      email: identity.email,
      first_name: identity.name,
      ...(identity.cpf.length === 11
        ? { identification: { type: 'CPF', number: identity.cpf } }
        : {}),
    },
    metadata: {
      restaurant_id: String(context.restaurantId),
      table_payment_public_id: context.intentPublicId,
      source: 'table_account',
    },
    external_reference: tableReference(context),
  };
  const response = await paymentApi.create({ body });
  const raw =
    typeof response === 'object' && response !== null
      ? ((response as { body?: unknown }).body ?? response)
      : {};
  const payment = raw as MercadoPagoPaymentPayload;
  const qrCode = String(payment.point_of_interaction?.transaction_data?.qr_code || '').trim();
  const externalId = String(payment.id || '').trim();
  if (!externalId || !qrCode) throw new Error('Mercado Pago não retornou um QR Code Pix válido.');
  return {
    externalId,
    status: providerStatus(payment.status),
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: qrCode,
    expiresAt: input.expiresAt,
  };
}

async function createPagBankPix(
  context: ProviderFactoryContext,
  input: CreateProviderPaymentInput,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const token = String(settings.pagbankToken || '').trim();
  if (!token) throw new Error('PagBank não configurado para este restaurante.');
  const identity = await customerIdentity(context);
  const reference = tableReference(context);
  const { response, body } = await fetchJson<PagBankOrderPayload>(`${pagBankApiBase()}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-idempotency-key': input.idempotencyKeyHash,
    },
    body: JSON.stringify({
      reference_id: reference,
      customer: {
        name: identity.name,
        email: identity.email,
        ...(identity.cpf.length === 11 || identity.cpf.length === 14
          ? { tax_id: identity.cpf }
          : {}),
      },
      items: [
        {
          reference_id: context.intentPublicId,
          name: 'Conta da mesa',
          quantity: 1,
          unit_amount: input.amountCents,
        },
      ],
      qr_codes: [{ amount: { value: input.amountCents } }],
    }),
  });
  const orderId = String(body.id || '').trim();
  const qrCode = String(body.qr_codes?.[0]?.text || '').trim();
  if (!response.ok || !orderId || !qrCode) {
    throw new Error(firstProviderError(body, 'Não foi possível gerar o Pix no PagBank.'));
  }
  return {
    externalId: `pagbank:${orderId}`,
    status: 'PENDING',
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: qrCode,
    expiresAt: input.expiresAt,
  };
}

async function createAsaasCustomer(
  context: ProviderFactoryContext,
  settings: Awaited<ReturnType<typeof readSettings>>,
) {
  const token = String(settings.asaasAccessToken || '').trim();
  if (!token) throw new Error('Asaas não configurado para este restaurante.');
  const identity = await customerIdentity(context);
  const { response, body } = await fetchJson<AsaasPayload>(`${asaasApiBase()}/v3/customers`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', access_token: token },
    body: JSON.stringify({
      name: identity.name,
      email: identity.email,
      ...(identity.cpf.length === 11 || identity.cpf.length === 14
        ? { cpfCnpj: identity.cpf }
        : {}),
      ...(identity.phone ? { mobilePhone: identity.phone } : {}),
    }),
  });
  const id = String(body.id || '').trim();
  if (!response.ok || !id) throw new Error(firstProviderError(body, 'Não foi possível preparar o pagamento no Asaas.'));
  return { id, token, identity };
}

async function createAsaasPix(
  context: ProviderFactoryContext,
  input: CreateProviderPaymentInput,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const customer = await createAsaasCustomer(context, settings);
  const reference = tableReference(context);
  const { response, body } = await fetchJson<AsaasPayload>(`${asaasApiBase()}/v3/payments`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', access_token: customer.token },
    body: JSON.stringify({
      customer: customer.id,
      billingType: 'PIX',
      value: safeMoneyAmount(input.amountCents),
      dueDate: new Date().toISOString().slice(0, 10),
      description: 'Conta da mesa',
      externalReference: reference,
    }),
  });
  const paymentId = String(body.id || '').trim();
  if (!response.ok || !paymentId) throw new Error(firstProviderError(body, 'Não foi possível gerar o Pix no Asaas.'));
  const qr = await fetchJson<AsaasPayload>(
    `${asaasApiBase()}/v3/payments/${encodeURIComponent(paymentId)}/pixQrCode`,
    { headers: { Accept: 'application/json', access_token: customer.token } },
  );
  const qrCode = String(qr.body.payload || '').trim();
  if (!qr.response.ok || !qrCode) throw new Error(firstProviderError(qr.body, 'Asaas não retornou o QR Code Pix.'));
  return {
    externalId: `asaas:${paymentId}`,
    status: providerStatus(body.status),
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: qrCode,
    expiresAt: input.expiresAt,
  };
}

async function createMercadoPagoCard(
  context: ProviderFactoryContext,
  input: CreateProviderPaymentInput,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const accessToken = String(settings.mercadoPagoAccessToken || '').trim();
  if (!accessToken) throw new Error('Mercado Pago não configurado para este restaurante.');
  const savedMethod = await getSavedMethod(context, CARD_PROVIDERS.MERCADO_PAGO);
  const identity = await customerIdentity(context);
  if (savedMethod && !savedMethod.providerCustomerId) {
    throw new Error('O cartão salvo não possui vínculo válido com o Mercado Pago.');
  }
  const reference = tableReference(context);
  const preferenceApi = await getMercadoPagoPreferenceApi(context.restaurantId);
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const response = await preferenceApi.create({
    body: {
      items: [
        {
          id: context.intentPublicId,
          title: 'Conta da mesa',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: safeMoneyAmount(input.amountCents),
        },
      ],
      external_reference: reference,
      metadata: {
        restaurant_id: String(context.restaurantId),
        table_payment_public_id: context.intentPublicId,
        source: 'table_account',
      },
      payer: { email: identity.email },
      back_urls: { success: frontendUrl, failure: frontendUrl, pending: frontendUrl },
    },
  });
  const raw =
    typeof response === 'object' && response !== null
      ? ((response as { body?: unknown }).body ?? response)
      : {};
  const preference = raw as { id?: unknown; init_point?: unknown };
  const checkoutUrl = String(preference.init_point || '').trim();
  if (!String(preference.id || '').trim() || !/^https:\/\//i.test(checkoutUrl)) {
    throw new Error('Mercado Pago não retornou um checkout seguro válido.');
  }
  return {
    externalId: `mp_ref:${reference}`,
    status: 'PENDING',
    amountCents: input.amountCents,
    checkoutUrl,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

async function createPagBankCard(
  context: ProviderFactoryContext,
  input: CreateProviderPaymentInput,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const token = String(settings.pagbankToken || '').trim();
  const email = String(settings.pagbankEmail || '').trim();
  if (!token || !email) throw new Error('PagBank não configurado para este restaurante.');
  const savedMethod = await getSavedMethod(context, CARD_PROVIDERS.PAGBANK);
  const identity = await customerIdentity(context);
  const reference = tableReference(context);

  if (savedMethod) {
    if (![11, 14].includes(identity.cpf.length)) {
      throw new Error('Cadastre um CPF válido no perfil para usar o cartão salvo.');
    }
    const { response, body } = await fetchJson<PagBankOrderPayload>(`${pagBankApiBase()}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-idempotency-key': input.idempotencyKeyHash,
      },
      body: JSON.stringify({
        reference_id: reference,
        customer: { name: identity.name, tax_id: identity.cpf },
        items: [
          {
            reference_id: context.intentPublicId,
            name: 'Conta da mesa',
            quantity: 1,
            unit_amount: input.amountCents,
          },
        ],
        charges: [
          {
            reference_id: reference,
            description: 'Conta da mesa',
            amount: { value: input.amountCents, currency: 'BRL' },
            payment_method: {
              type: 'CREDIT_CARD',
              installments: 1,
              capture: true,
              card: { id: savedMethod.providerPaymentMethodId },
              holder: { name: savedMethod.holderName || identity.name, tax_id: identity.cpf },
            },
          },
        ],
      }),
    });
    const charge = body.charges?.[0];
    const chargeId = String(charge?.id || '').trim();
    if (!response.ok || !chargeId) throw new Error(firstProviderError(body, 'PagBank recusou o cartão salvo.'));
    return {
      externalId: `pagbank_charge:${chargeId}`,
      status: providerStatus(charge?.status),
      amountCents: input.amountCents,
      checkoutUrl: null,
      paymentCode: null,
      expiresAt: input.expiresAt,
    };
  }

  const params = new URLSearchParams();
  params.set('email', email);
  params.set('token', token);
  params.set('currency', 'BRL');
  params.set('itemId1', context.intentPublicId);
  params.set('itemDescription1', 'Conta da mesa');
  params.set('itemAmount1', safeMoneyAmount(input.amountCents).toFixed(2));
  params.set('itemQuantity1', '1');
  params.set('reference', reference);
  const response = await fetch('https://ws.pagseguro.uol.com.br/v2/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: params.toString(),
  });
  const responseText = await response.text();
  const code = /<code>([^<]+)<\/code>/i.exec(responseText)?.[1]?.trim() || '';
  if (!response.ok || !code) throw new Error('PagBank não retornou um checkout seguro válido.');
  return {
    externalId: `pagbank_ref:${reference}`,
    status: 'PENDING',
    amountCents: input.amountCents,
    checkoutUrl: `https://pagseguro.uol.com.br/v2/checkout/payment.html?code=${encodeURIComponent(code)}`,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

async function createAsaasCard(
  context: ProviderFactoryContext,
  input: CreateProviderPaymentInput,
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const savedMethod = await getSavedMethod(context, CARD_PROVIDERS.ASAAS);
  const reference = tableReference(context);
  const token = String(settings.asaasAccessToken || '').trim();
  if (!token) throw new Error('Asaas não configurado para este restaurante.');

  if (savedMethod) {
    if (!savedMethod.providerCustomerId) throw new Error('O cartão salvo não possui vínculo válido com o Asaas.');
    const { response, body } = await fetchJson<AsaasPayload>(`${asaasApiBase()}/v3/payments`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', access_token: token },
      body: JSON.stringify({
        customer: savedMethod.providerCustomerId,
        billingType: 'CREDIT_CARD',
        value: safeMoneyAmount(input.amountCents),
        dueDate: new Date().toISOString().slice(0, 10),
        description: 'Conta da mesa',
        externalReference: reference,
        creditCardToken: savedMethod.providerPaymentMethodId,
      }),
    });
    const paymentId = String(body.id || '').trim();
    if (!response.ok || !paymentId) throw new Error(firstProviderError(body, 'Asaas recusou o cartão salvo.'));
    return {
      externalId: `asaas_card:${paymentId}`,
      status: providerStatus(body.status),
      amountCents: input.amountCents,
      checkoutUrl: null,
      paymentCode: null,
      expiresAt: input.expiresAt,
    };
  }

  const customer = await createAsaasCustomer(context, settings);
  const { response, body } = await fetchJson<AsaasPayload>(`${asaasApiBase()}/v3/payments`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', access_token: token },
    body: JSON.stringify({
      customer: customer.id,
      billingType: 'UNDEFINED',
      value: safeMoneyAmount(input.amountCents),
      dueDate: new Date().toISOString().slice(0, 10),
      description: 'Conta da mesa',
      externalReference: reference,
    }),
  });
  const paymentId = String(body.id || '').trim();
  const checkoutUrl = String(body.invoiceUrl || '').trim();
  if (!response.ok || !paymentId || !/^https:\/\//i.test(checkoutUrl)) {
    throw new Error(firstProviderError(body, 'Asaas não retornou um checkout seguro válido.'));
  }
  return {
    externalId: `asaas_card:${paymentId}`,
    status: providerStatus(body.status),
    amountCents: input.amountCents,
    checkoutUrl,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

async function getMercadoPagoCardStatus(
  context: ProviderFactoryContext,
  input: { externalId: string; amountCents: number; expiresAt: Date },
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const token = String(settings.mercadoPagoAccessToken || '').trim();
  const reference = tableReference(context);
  if (!token || input.externalId !== `mp_ref:${reference}`) throw new Error('Referência Mercado Pago inválida.');
  const url = new URL('https://api.mercadopago.com/v1/payments/search');
  url.searchParams.set('external_reference', reference);
  url.searchParams.set('sort', 'date_created');
  url.searchParams.set('criteria', 'desc');
  const { response, body } = await fetchJson<MercadoPagoSearchPayload>(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Não foi possível consultar o pagamento no Mercado Pago.');
  const match = (body.results || []).find(
    (candidate) =>
      String(candidate.external_reference || '').trim() === reference &&
      isAmountMatch(candidate.transaction_amount, input.amountCents),
  );
  return {
    externalId: input.externalId,
    status: match ? providerStatus(match.status) : 'PENDING',
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

async function getAsaasCardStatus(
  input: { externalId: string; amountCents: number; expiresAt: Date },
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const token = String(settings.asaasAccessToken || '').trim();
  const paymentId = input.externalId.replace(/^asaas_card:/, '');
  const { response, body } = await fetchJson<AsaasPayload>(
    `${asaasApiBase()}/v3/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Accept: 'application/json', access_token: token } },
  );
  if (!response.ok || !isAmountMatch(body.value, input.amountCents)) {
    throw new Error('A cobrança retornada pelo Asaas não corresponde ao pagamento da mesa.');
  }
  return {
    externalId: input.externalId,
    status: providerStatus(body.status),
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

async function getPagBankCardStatus(
  context: ProviderFactoryContext,
  input: { externalId: string; amountCents: number; expiresAt: Date },
  settings: Awaited<ReturnType<typeof readSettings>>,
): Promise<ProviderPayment> {
  const token = String(settings.pagbankToken || '').trim();
  const email = String(settings.pagbankEmail || '').trim();
  if (input.externalId.startsWith('pagbank_charge:')) {
    const chargeId = input.externalId.replace(/^pagbank_charge:/, '');
    const { response, body } = await fetchJson<PagBankChargePayload>(
      `${pagBankApiBase()}/charges/${encodeURIComponent(chargeId)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );
    if (!response.ok || !isAmountMatch(body.amount?.value, input.amountCents, 'MINOR')) {
      throw new Error('A cobrança retornada pelo PagBank não corresponde ao pagamento da mesa.');
    }
    return {
      externalId: input.externalId,
      status: providerStatus(body.status),
      amountCents: input.amountCents,
      checkoutUrl: null,
      paymentCode: null,
      expiresAt: input.expiresAt,
    };
  }

  const reference = tableReference(context);
  if (!email || !token || input.externalId !== `pagbank_ref:${reference}`) {
    throw new Error('Referência PagBank inválida.');
  }
  const url = new URL('https://ws.pagseguro.uol.com.br/v2/transactions');
  url.searchParams.set('email', email);
  url.searchParams.set('token', token);
  url.searchParams.set('reference', reference);
  url.searchParams.set('page', '1');
  url.searchParams.set('maxPageResults', '10');
  const response = await fetch(url, { headers: { Accept: 'application/xml' } });
  const xml = await response.text();
  if (!response.ok) throw new Error('Não foi possível consultar o checkout no PagBank.');
  const parsed = load(xml, { xmlMode: true });
  let foundStatus = '';
  parsed('transaction').each((_index, node) => {
    if (foundStatus) return;
    const transaction = parsed(node);
    const transactionReference = transaction.children('reference').first().text().trim();
    const grossAmount = Number(transaction.children('grossAmount').first().text().trim());
    if (transactionReference === reference && isAmountMatch(grossAmount, input.amountCents)) {
      foundStatus = transaction.children('status').first().text().trim();
    }
  });
  const legacyStatus = foundStatus === '3' || foundStatus === '4' ? 'PAID' : ['6', '7', '8'].includes(foundStatus) ? 'FAILED' : 'PENDING';
  return {
    externalId: input.externalId,
    status: legacyStatus,
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

class ConfiguredTablePaymentProvider implements PaymentProvider {
  readonly code: string;

  constructor(
    private readonly context: ProviderFactoryContext,
    private readonly provider: PixProvider | CardProvider,
  ) {
    this.code = provider;
  }

  async createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment> {
    const settings = await readSettings(this.context.restaurantId);
    if (this.context.method === 'PIX') {
      if (this.provider === PIX_PROVIDERS.MERCADO_PAGO) return createMercadoPagoPix(this.context, input, settings);
      if (this.provider === PIX_PROVIDERS.PAGBANK) return createPagBankPix(this.context, input, settings);
      if (this.provider === PIX_PROVIDERS.ASAAS) return createAsaasPix(this.context, input, settings);
    } else {
      if (this.provider === CARD_PROVIDERS.MERCADO_PAGO) return createMercadoPagoCard(this.context, input, settings);
      if (this.provider === CARD_PROVIDERS.PAGBANK) return createPagBankCard(this.context, input, settings);
      if (this.provider === CARD_PROVIDERS.ASAAS) return createAsaasCard(this.context, input, settings);
    }
    throw new Error('Provedor online não suportado para a conta da mesa.');
  }

  async getPayment(externalId: string): Promise<ProviderPayment> {
    const settings = await readSettings(this.context.restaurantId);
    const intent = await prisma.tablePaymentIntent.findFirst({
      where: {
        publicId: this.context.intentPublicId,
        restaurantId: this.context.restaurantId,
        provider: this.code,
        providerExternalId: externalId,
      },
      select: { totalCents: true, expiresAt: true },
    });
    if (!intent) throw new Error('Pagamento da mesa não encontrado para consulta no provedor.');
    const amountCents = Number(intent.totalCents);
    if (this.context.method === 'PIX') {
      const status = await orderPixPaymentService.getPaymentStatus({
        paymentId: externalId,
        restaurantId: this.context.restaurantId,
      });
      const externalReference = String(status.externalReference || '').trim();
      if (externalReference && externalReference !== tableReference(this.context)) {
        throw new Error('A referência retornada pelo provedor não corresponde à conta da mesa.');
      }
      const providerAmount = Number(status.amount);
      if (Number.isFinite(providerAmount) && !isAmountMatch(providerAmount, amountCents)) {
        throw new Error('O valor retornado pelo provedor não corresponde à conta da mesa.');
      }
      return {
        externalId,
        status: status.isApproved ? 'PAID' : providerStatus(status.status),
        amountCents,
        checkoutUrl: null,
        paymentCode: null,
        expiresAt: intent.expiresAt,
      };
    }
    if (this.provider === CARD_PROVIDERS.MERCADO_PAGO) {
      return getMercadoPagoCardStatus(this.context, { externalId, amountCents, expiresAt: intent.expiresAt }, settings);
    }
    if (this.provider === CARD_PROVIDERS.ASAAS) {
      return getAsaasCardStatus({ externalId, amountCents, expiresAt: intent.expiresAt }, settings);
    }
    if (this.provider === CARD_PROVIDERS.PAGBANK) {
      return getPagBankCardStatus(this.context, { externalId, amountCents, expiresAt: intent.expiresAt }, settings);
    }
    throw new Error('Consulta de cartão não suportada para este provedor.');
  }

  async cancelPayment(_input: ProviderMutationInput): Promise<ProviderPayment> {
    throw new Error('Cancelamento automático do checkout online ainda não está disponível.');
  }

  async refundPayment(_input: ProviderMutationInput): Promise<ProviderPayment> {
    throw new Error('Estorno automático deste pagamento deve ser tratado pelo fluxo financeiro do provedor.');
  }

  async validateWebhook(_input: ProviderWebhookInput): Promise<ValidatedPaymentWebhook> {
    throw new Error('Este adapter usa reconciliação canônica por consulta ao provedor.');
  }
}

export async function createConfiguredTablePaymentProvider(
  context: ProviderFactoryContext,
): Promise<PaymentProvider> {
  const readiness = await getConfiguredTablePaymentReadiness(context.restaurantId);
  if (context.method === 'PIX') {
    if (!readiness.allowPix || !readiness.pixProvider) {
      throw new Error('Pix online não está configurado no painel de pagamentos deste restaurante.');
    }
    return new ConfiguredTablePaymentProvider(context, readiness.pixProvider);
  }
  if (!readiness.allowCard || !readiness.cardProvider) {
    throw new Error('Cartão online não está configurado no painel de pagamentos deste restaurante.');
  }
  return new ConfiguredTablePaymentProvider(context, readiness.cardProvider);
}

export async function createConfiguredTablePaymentProviderForExisting(input: {
  restaurantId: number;
  participantId: number;
  participantUserId: number | null;
  participantName: string | null;
  participantPhone: string | null;
  intentPublicId: string;
  method: 'PIX' | 'CARD';
  provider: string;
}) {
  const provider = normalizeProvider(input.provider);
  const supported = input.method === 'PIX' ? SUPPORTED_PIX.has(provider) : SUPPORTED_CARD.has(provider);
  if (!supported) throw new Error('Provedor do pagamento da mesa não suportado.');
  return new ConfiguredTablePaymentProvider(input, provider as PixProvider | CardProvider);
}
