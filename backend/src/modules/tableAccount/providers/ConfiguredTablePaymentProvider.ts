import { OrderType, PaymentMethod } from '@prisma/client';
import { load } from 'cheerio';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import {
  getCardCheckoutProviderHandler,
  type CreateOrderCardCheckoutPayload,
} from '../../orders/services/cardCheckoutProviders.js';
import {
  CARD_PROVIDERS,
  PIX_PROVIDERS,
  type CardProvider,
  type PixProvider,
} from '../../payments/providers/providerCatalog.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
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

export type ConfiguredTablePaymentProviderContext = {
  restaurantId: number;
  participantId: number;
  participantUserId: number | null;
  participantName: string | null;
  participantPhone: string | null;
  intentId: number;
  intentPublicId: string;
  method: 'PIX' | 'CARD';
};

type PaymentIdentity = {
  name: string;
  email: string;
  cpf: string;
  phone: string;
};

type AsaasPaymentPayload = {
  id?: string;
  status?: string;
  value?: number;
  currency?: string;
  externalReference?: string;
  errors?: Array<{ description?: string }>;
};

type PagBankChargePayload = {
  id?: string;
  status?: string;
  reference_id?: string;
  amount?: { value?: number; currency?: string };
};

type MercadoPagoPaymentPayload = {
  id?: string | number;
  status?: string;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
};

type MercadoPagoSearchPayload = {
  results?: MercadoPagoPaymentPayload[];
};

function normalizeProvider(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function providerStatus(value: unknown): ProviderPayment['status'] {
  const status = String(value || '').trim().toUpperCase();
  if (PAID_STATUSES.has(status)) return 'PAID';
  if (REFUNDED_STATUSES.has(status)) return 'REFUNDED';
  if (EXPIRED_STATUSES.has(status)) return 'EXPIRED';
  if (FAILED_STATUSES.has(status)) return 'FAILED';
  return 'PENDING';
}

function centsToMajor(cents: number) {
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error('Valor do pagamento inválido.');
  }
  return Number((cents / 100).toFixed(2));
}

function matchesAmount(value: unknown, expectedCents: number, minor = false) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return false;
  return (minor ? Math.round(amount) : Math.round((amount + Number.EPSILON) * 100)) === expectedCents;
}

function tableCardReference(context: ConfiguredTablePaymentProviderContext) {
  return `ordercard:${context.intentId}:${context.restaurantId}`;
}

function asaasBaseUrl() {
  return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
    .trim()
    .replace(/\/+$/, '');
}

function pagBankBaseUrl() {
  return String(process.env.PAGBANK_API_BASE_URL || 'https://api.pagseguro.com')
    .trim()
    .replace(/\/+$/, '');
}

async function settingsFor(restaurantId: number) {
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  if (!settings) throw new Error('Configurações de pagamento do restaurante não encontradas.');
  return settings;
}

function credentialReady(
  settings: Awaited<ReturnType<typeof settingsFor>>,
  provider: string,
  method: 'PIX' | 'CARD',
) {
  if (provider === PIX_PROVIDERS.MERCADO_PAGO || provider === CARD_PROVIDERS.MERCADO_PAGO) {
    return Boolean(String(settings.mercadoPagoAccessToken || '').trim());
  }
  if (provider === PIX_PROVIDERS.ASAAS || provider === CARD_PROVIDERS.ASAAS) {
    return Boolean(String(settings.asaasAccessToken || '').trim());
  }
  if (provider === PIX_PROVIDERS.PAGBANK || provider === CARD_PROVIDERS.PAGBANK) {
    const token = Boolean(String(settings.pagbankToken || '').trim());
    const email = Boolean(String(settings.pagbankEmail || '').trim());
    return method === 'CARD' ? token && email : token;
  }
  return false;
}

export async function getConfiguredTablePaymentReadiness(
  restaurantId: number,
): Promise<TableOnlinePaymentReadiness> {
  const settings = await settingsFor(restaurantId);
  const pixRaw = normalizeProvider(settings.pixProvider);
  const cardRaw = normalizeProvider(settings.cardGateway);
  const pixProvider = SUPPORTED_PIX.has(pixRaw) ? (pixRaw as PixProvider) : null;
  const cardProvider = SUPPORTED_CARD.has(cardRaw) ? (cardRaw as CardProvider) : null;

  return {
    allowPix: Boolean(
      settings.acceptsPix &&
        String(settings.pixKey || '').trim() &&
        pixProvider &&
        credentialReady(settings, pixProvider, 'PIX'),
    ),
    allowCard: Boolean(
      settings.acceptsCard && cardProvider && credentialReady(settings, cardProvider, 'CARD'),
    ),
    pixProvider,
    cardProvider,
  };
}

async function readIdentity(
  context: ConfiguredTablePaymentProviderContext,
): Promise<PaymentIdentity> {
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
    cpf: String(user?.cpf || '').replace(/\D/g, ''),
    phone: String(user?.phone || context.participantPhone || '').replace(/\D/g, ''),
  };
}

async function defaultSavedCard(
  context: ConfiguredTablePaymentProviderContext,
  provider: CardProvider,
) {
  if (!context.participantUserId) return null;
  return withTenantDbContext(context.restaurantId, (db) =>
    db.customerPaymentMethod.findFirst({
      where: {
        userId: context.participantUserId || undefined,
        restaurantId: context.restaurantId,
        provider,
        active: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: { publicId: true },
    }),
  );
}

async function createPix(
  context: ConfiguredTablePaymentProviderContext,
  input: CreateProviderPaymentInput,
): Promise<ProviderPayment> {
  const identity = await readIdentity(context);
  const result = await orderPixPaymentService.createPixPayment({
    restaurantId: context.restaurantId,
    type: 'MESA',
    paymentMethod: 'PIX',
    items: [],
    customerName: identity.name,
    customerCpf: identity.cpf,
    customerPhone: identity.phone,
    userEmail: identity.email,
    orderTotal: centsToMajor(input.amountCents),
    orderSubtotal: centsToMajor(input.amountCents),
    orderDeliveryFee: 0,
  });

  if (!String(result.paymentId || '').trim() || !String(result.qrCode || '').trim()) {
    throw new Error('O provedor não retornou um QR Code Pix válido.');
  }

  return {
    externalId: String(result.paymentId),
    status: providerStatus(result.status),
    amountCents: input.amountCents,
    checkoutUrl: null,
    paymentCode: String(result.qrCode),
    expiresAt: input.expiresAt,
  };
}

async function createCard(
  context: ConfiguredTablePaymentProviderContext,
  input: CreateProviderPaymentInput,
  provider: CardProvider,
): Promise<ProviderPayment> {
  const identity = await readIdentity(context);
  const savedCard = await defaultSavedCard(context, provider);
  const handler = getCardCheckoutProviderHandler(provider);
  const frontendUrl = String(process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  const payload: CreateOrderCardCheckoutPayload = {
    userId: context.participantUserId,
    restaurantId: context.restaurantId,
    userRestaurantId: context.restaurantId,
    tableSessionId: null,
    tableSessionTableId: null,
    participantId: context.participantId,
    settlementMode: 'PAY_NOW',
    type: OrderType.MESA,
    paymentMethod: PaymentMethod.CARTAO,
    customerName: identity.name,
    customerCpf: identity.cpf,
    customerPhone: identity.phone,
    items: [],
    paymentMethodId: savedCard?.publicId || null,
    successUrl: frontendUrl,
    cancelUrl: frontendUrl,
  };
  const checkout = await handler.createCheckout({
    payload,
    order: {
      id: context.intentId,
      publicId: context.intentPublicId,
      restaurantId: context.restaurantId,
      total: centsToMajor(input.amountCents),
      systemFee: 0,
      restaurant: { name: 'Conta da mesa' },
    },
    successUrlBase: frontendUrl,
    cancelUrlBase: frontendUrl,
  });
  const externalId = String(checkout.persistenceSessionId || checkout.sessionId || '').trim();
  if (!externalId) throw new Error('O gateway não retornou uma referência de pagamento válida.');

  return {
    externalId,
    status: checkout.paymentApproved ? 'PAID' : 'PENDING',
    amountCents: input.amountCents,
    checkoutUrl: String(checkout.checkoutUrl || '').trim() || null,
    paymentCode: null,
    expiresAt: input.expiresAt,
  };
}

async function fetchJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T;
  return { response, body };
}

async function getMercadoPagoCard(
  context: ConfiguredTablePaymentProviderContext,
  externalId: string,
  amountCents: number,
  expiresAt: Date,
) {
  const settings = await settingsFor(context.restaurantId);
  const token = String(settings.mercadoPagoAccessToken || '').trim();
  if (!token) throw new Error('Mercado Pago não configurado para este restaurante.');
  const reference = tableCardReference(context);
  const url = new URL('https://api.mercadopago.com/v1/payments/search');
  url.searchParams.set('external_reference', reference);
  url.searchParams.set('sort', 'date_created');
  url.searchParams.set('criteria', 'desc');
  const { response, body } = await fetchJson<MercadoPagoSearchPayload>(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error('Não foi possível consultar o pagamento no Mercado Pago.');
  const payment = (body.results || []).find(
    (candidate) =>
      String(candidate.external_reference || '').trim() === reference &&
      matchesAmount(candidate.transaction_amount, amountCents),
  );
  return {
    externalId,
    status: payment ? providerStatus(payment.status) : ('PENDING' as const),
    amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt,
  };
}

async function getAsaasCard(externalId: string, amountCents: number, expiresAt: Date, restaurantId: number) {
  const settings = await settingsFor(restaurantId);
  const token = String(settings.asaasAccessToken || '').trim();
  const paymentId = externalId.replace(/^asaas_pay:/, '');
  if (!token || !paymentId) throw new Error('Referência Asaas inválida.');
  const { response, body } = await fetchJson<AsaasPaymentPayload>(
    `${asaasBaseUrl()}/v3/payments/${encodeURIComponent(paymentId)}`,
    { headers: { access_token: token, Accept: 'application/json' } },
  );
  if (!response.ok || !matchesAmount(body.value, amountCents)) {
    throw new Error('A cobrança retornada pelo Asaas não corresponde à conta da mesa.');
  }
  return {
    externalId,
    status: providerStatus(body.status),
    amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt,
  };
}

async function getPagBankCard(
  context: ConfiguredTablePaymentProviderContext,
  externalId: string,
  amountCents: number,
  expiresAt: Date,
) {
  const settings = await settingsFor(context.restaurantId);
  const token = String(settings.pagbankToken || '').trim();
  const email = String(settings.pagbankEmail || '').trim();

  if (externalId.startsWith('pagbank_tx:')) {
    const chargeId = externalId.replace(/^pagbank_tx:/, '');
    const { response, body } = await fetchJson<PagBankChargePayload>(
      `${pagBankBaseUrl()}/charges/${encodeURIComponent(chargeId)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    );
    if (!response.ok || !matchesAmount(body.amount?.value, amountCents, true)) {
      throw new Error('A cobrança retornada pelo PagBank não corresponde à conta da mesa.');
    }
    return {
      externalId,
      status: providerStatus(body.status),
      amountCents,
      checkoutUrl: null,
      paymentCode: null,
      expiresAt,
    };
  }

  if (!email || !token || !externalId.startsWith('pagbank_chk:')) {
    throw new Error('Referência PagBank inválida.');
  }
  const reference = tableCardReference(context);
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
  let status = '';
  parsed('transaction').each((_index, node) => {
    if (status) return;
    const transaction = parsed(node);
    if (
      transaction.children('reference').first().text().trim() === reference &&
      matchesAmount(transaction.children('grossAmount').first().text().trim(), amountCents)
    ) {
      status = transaction.children('status').first().text().trim();
    }
  });
  return {
    externalId,
    status:
      status === '3' || status === '4'
        ? ('PAID' as const)
        : ['6', '7', '8'].includes(status)
          ? ('FAILED' as const)
          : ('PENDING' as const),
    amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt,
  };
}

export class ConfiguredTablePaymentProvider implements PaymentProvider {
  readonly code: string;

  constructor(
    private readonly context: ConfiguredTablePaymentProviderContext,
    private readonly provider: PixProvider | CardProvider,
  ) {
    this.code = provider;
  }

  async createPayment(input: CreateProviderPaymentInput): Promise<ProviderPayment> {
    return this.context.method === 'PIX'
      ? createPix(this.context, input)
      : createCard(this.context, input, this.provider as CardProvider);
  }

  async getPayment(externalId: string): Promise<ProviderPayment> {
    const intent = await prisma.tablePaymentIntent.findFirst({
      where: {
        id: this.context.intentId,
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
      if (Number.isFinite(Number(status.amount)) && !matchesAmount(status.amount, amountCents)) {
        throw new Error('O valor retornado pelo Pix não corresponde à conta da mesa.');
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
      return getMercadoPagoCard(this.context, externalId, amountCents, intent.expiresAt);
    }
    if (this.provider === CARD_PROVIDERS.ASAAS) {
      return getAsaasCard(externalId, amountCents, intent.expiresAt, this.context.restaurantId);
    }
    if (this.provider === CARD_PROVIDERS.PAGBANK) {
      return getPagBankCard(this.context, externalId, amountCents, intent.expiresAt);
    }
    throw new Error('Consulta de cartão não suportada para este gateway.');
  }

  async cancelPayment(_input: ProviderMutationInput): Promise<ProviderPayment> {
    throw new Error('Cancelamento remoto deste checkout ainda não está disponível.');
  }

  async refundPayment(_input: ProviderMutationInput): Promise<ProviderPayment> {
    throw new Error('Estorno remoto deve ser realizado pelo fluxo financeiro do gateway.');
  }

  async validateWebhook(_input: ProviderWebhookInput): Promise<ValidatedPaymentWebhook> {
    throw new Error('Este adapter usa reconciliação segura consultando o gateway.');
  }
}

export async function createConfiguredTablePaymentProvider(
  context: ConfiguredTablePaymentProviderContext,
): Promise<PaymentProvider> {
  const readiness = await getConfiguredTablePaymentReadiness(context.restaurantId);
  if (context.method === 'PIX') {
    if (!readiness.allowPix || !readiness.pixProvider) {
      throw new Error('Pix online não está configurado no painel de Pagamentos deste restaurante.');
    }
    return new ConfiguredTablePaymentProvider(context, readiness.pixProvider);
  }
  if (!readiness.allowCard || !readiness.cardProvider) {
    throw new Error('Cartão online não está configurado no painel de Pagamentos deste restaurante.');
  }
  return new ConfiguredTablePaymentProvider(context, readiness.cardProvider);
}

export function createConfiguredTablePaymentProviderForExisting(
  context: ConfiguredTablePaymentProviderContext,
  provider: string,
): PaymentProvider {
  const normalized = normalizeProvider(provider);
  const supported = context.method === 'PIX' ? SUPPORTED_PIX.has(normalized) : SUPPORTED_CARD.has(normalized);
  if (!supported) throw new Error('Provedor deste pagamento da mesa não é suportado.');
  return new ConfiguredTablePaymentProvider(context, normalized as PixProvider | CardProvider);
}
