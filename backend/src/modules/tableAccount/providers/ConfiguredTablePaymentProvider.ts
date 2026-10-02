import prisma from '../../../config/prisma.js';
import orderPixPaymentService from '../../orders/services/OrderPixPaymentService.js';
import directOrderCardPaymentService from '../../orders/services/DirectOrderCardPaymentService.js';
import { mercadoPagoCardExternalReferenceCandidates } from '../../orders/domain/mercadoPagoCardReference.js';
import {
  tableCardExternalReference,
  tableCardExternalReferenceCandidates,
} from '../domain/tableCardExternalReference.js';
import {
  CARD_PROVIDERS,
  PIX_PROVIDERS,
  type CardProvider,
  type PixProvider,
} from '../../payments/providers/providerCatalog.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { getMercadoPagoAccessToken } from '../../restaurantSettings/services/RestaurantPaymentCredentialsService.js';
import { mercadoPagoCheckoutIdempotencyKey } from '../../payments/providers/mercadoPagoClient.js';
import { tablePixExternalReference } from '../domain/tablePixExternalReference.js';
import { paymentConnectionConfiguration } from '../../restaurantSettings/services/RestaurantPaymentReadinessService.js';
import { getDirectTablePayment, mutateDirectTablePayment } from './tablePaymentGatewayMutation.js';
import type {
  CreateProviderPaymentInput,
  PaymentProvider,
  ProviderMutationInput,
  ProviderPayment,
  ProviderWebhookInput,
  ValidatedPaymentWebhook,
} from './PaymentProvider.js';

const ACTIVE_PIX = new Set<string>([PIX_PROVIDERS.MERCADO_PAGO]);
const ACTIVE_CARD = new Set<string>([CARD_PROVIDERS.MERCADO_PAGO]);
const HISTORICAL_PIX = ACTIVE_PIX;
const HISTORICAL_CARD = ACTIVE_CARD;

const PAID_STATUSES = new Set(['PAID', 'APPROVED', 'ACCREDITED', 'RECEIVED', 'CONFIRMED']);
const FAILED_STATUSES = new Set(['FAILED', 'DECLINED', 'REJECTED']);
const CANCELED_STATUSES = new Set(['CANCELED', 'CANCELLED']);
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

type MercadoPagoPixOrderPayload = {
  id?: string;
  status?: string;
  total_amount?: string | number;
  external_reference?: string;
  currency?: string;
  transactions?: {
    payments?: Array<{
      amount?: string | number;
      status?: string;
      status_detail?: string;
      payment_method?: {
        id?: string;
        type?: string;
        ticket_url?: string;
        qr_code?: string;
        qr_code_base64?: string;
      };
    }>;
  };
};

export class PixPaymentProviderRequestError extends Error {
  constructor(
    message: string,
    public readonly providerStatus: number,
    public readonly providerCode: string,
  ) {
    super(message);
    this.name = 'PixPaymentProviderRequestError';
  }
}

function normalizeProvider(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function providerStatus(value: unknown): ProviderPayment['status'] {
  const status = String(value || '')
    .trim()
    .toUpperCase();
  if (PAID_STATUSES.has(status)) return 'PAID';
  if (REFUNDED_STATUSES.has(status)) return 'REFUNDED';
  if (EXPIRED_STATUSES.has(status)) return 'EXPIRED';
  if (CANCELED_STATUSES.has(status)) return 'CANCELED';
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
  return (
    (minor ? Math.round(amount) : Math.round((amount + Number.EPSILON) * 100)) === expectedCents
  );
}

function asaasBaseUrl() {
  return String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
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
    const platformReady = paymentConnectionConfiguration('MERCADO_PAGO');
    if (!platformReady) return false;

    const accessTokenReady = Boolean(String(settings.mercadoPagoAccessToken || '').trim());
    const refreshTokenReady = Boolean(String(settings.mercadoPagoRefreshToken || '').trim());
    if (method === 'PIX') return accessTokenReady && refreshTokenReady;

    return Boolean(
      accessTokenReady &&
        refreshTokenReady &&
        String(settings.mercadoPagoPublicKey || '').trim(),
    );
  }
  if (provider === PIX_PROVIDERS.ASAAS || provider === CARD_PROVIDERS.ASAAS) {
    return Boolean(String(settings.asaasAccessToken || '').trim());
  }
  return false;
}

export async function getConfiguredTablePaymentReadiness(
  restaurantId: number,
): Promise<TableOnlinePaymentReadiness> {
  const settings = await settingsFor(restaurantId);
  const pixRaw = normalizeProvider(settings.pixProvider);
  const cardRaw = normalizeProvider(settings.cardGateway);
  const pixProvider = ACTIVE_PIX.has(pixRaw) ? (pixRaw as PixProvider) : null;
  const cardProvider = ACTIVE_CARD.has(cardRaw) ? (cardRaw as CardProvider) : null;

  return {
    allowPix: Boolean(
      settings.acceptsPix && pixProvider && credentialReady(settings, pixProvider, 'PIX'),
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
      : `pagamentos+mesa-${context.restaurantId}-${context.participantId}@gastronexa.com.br`,
    cpf: String(user?.cpf || '').replace(/\D/g, ''),
    phone: String(user?.phone || context.participantPhone || '').replace(/\D/g, ''),
  };
}

async function createPix(
  context: ConfiguredTablePaymentProviderContext,
  input: CreateProviderPaymentInput,
): Promise<ProviderPayment> {
  const identity = await readIdentity(context);
  const accessToken = await getMercadoPagoAccessToken(context.restaurantId);
  const amount = centsToMajor(input.amountCents).toFixed(2);
  const externalReference = tablePixExternalReference(context.intentId, context.restaurantId);
  const idempotencyKey = mercadoPagoCheckoutIdempotencyKey(input.idempotencyKeyHash);

  const response = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'automatic',
      total_amount: amount,
      external_reference: externalReference,
      payer: {
        email: identity.email,
        first_name: identity.name || 'Cliente',
      },
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: 'pix',
              type: 'bank_transfer',
            },
            expiration_time: 'PT30M',
          },
        ],
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as MercadoPagoPixOrderPayload & {
    code?: unknown;
    error?: unknown;
    message?: unknown;
  };

  if (!response.ok) {
    const providerCode = String(body.code || body.error || 'mercado_pago_pix_request_error')
      .trim()
      .slice(0, 120);
    if (response.status >= 400 && response.status < 500) {
      throw new PixPaymentProviderRequestError(
        'O Mercado Pago recusou a criação do Pix da mesa.',
        response.status,
        providerCode,
      );
    }
    throw new Error('Falha temporária ao gerar o Pix da mesa no Mercado Pago.');
  }

  const providerOrderId = String(body.id || '').trim();
  const payment = Array.isArray(body.transactions?.payments)
    ? body.transactions?.payments?.[0]
    : null;
  const qrCode = String(payment?.payment_method?.qr_code || '').trim();

  if (
    !providerOrderId ||
    !qrCode ||
    String(body.external_reference || '').trim() !== externalReference ||
    String(body.currency || 'BRL').toUpperCase() !== 'BRL' ||
    !matchesAmount(body.total_amount, input.amountCents)
  ) {
    throw new Error('O Mercado Pago retornou uma order Pix incompleta ou divergente.');
  }

  return {
    externalId: `mp_order:${providerOrderId}`,
    status: providerStatus(payment?.status || body.status),
    amountCents: input.amountCents,
    checkoutUrl: String(payment?.payment_method?.ticket_url || '').trim() || null,
    paymentCode: qrCode,
    expiresAt: input.expiresAt,
  };
}

export function resolveTableCardFrontendUrl(
  env: { NODE_ENV?: string; FRONTEND_URL?: string } = process.env,
) {
  const configured = String(env.FRONTEND_URL || '').trim();
  const value = env.NODE_ENV === 'production' ? configured : configured || 'http://localhost:5173';

  if (!value) {
    throw new Error('FRONTEND_URL não configurada para o pagamento com cartão da mesa.');
  }

  return value;
}

async function createCard(
  context: ConfiguredTablePaymentProviderContext,
  input: CreateProviderPaymentInput,
  provider: CardProvider,
): Promise<ProviderPayment> {
  if (!input.cardPayment) {
    throw new Error('Os dados protegidos do cartão não foram informados.');
  }

  const identity = await readIdentity(context);
  const frontendUrl = resolveTableCardFrontendUrl();

  const result = await directOrderCardPaymentService.execute({
    provider,
    payload: {
      userId: context.participantUserId,
      customerName: identity.name,
      customerPhone: identity.phone,
      paymentMethodId: input.cardPayment.paymentMethodId || null,
      cardPaymentType: input.cardPayment.cardPaymentType || 'credit',
      cardToken: input.cardPayment.cardToken || null,
      cardPaymentMethodId: input.cardPayment.cardPaymentMethodId || null,
      cardBrand: input.cardPayment.cardBrand || null,
      cardLast4: input.cardPayment.cardLast4 || null,
      holderName: input.cardPayment.holderName || null,
      holderTaxId: input.cardPayment.holderTaxId || null,
      payerEmail: input.cardPayment.payerEmail || identity.email,
      mercadoPagoDeviceId: input.cardPayment.mercadoPagoDeviceId || null,
    },
    order: {
      id: context.intentId,
      publicId: context.intentPublicId,
      restaurantId: context.restaurantId,
      externalReference: tableCardExternalReference(context.intentId, context.restaurantId),
      total: centsToMajor(input.amountCents),
      systemFee: 0,
      restaurant: { name: 'Conta da mesa' },
    },
    successUrlBase: frontendUrl,
    idempotencyKey: input.idempotencyKeyHash,
  });

  return {
    externalId: String(result.persistenceSessionId || result.sessionId),
    status: result.paymentApproved ? 'PAID' : 'PENDING',
    amountCents: input.amountCents,
    checkoutUrl: null,
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
  const token = await getMercadoPagoAccessToken(context.restaurantId);
  if (!token) throw new Error('Mercado Pago não configurado para este restaurante.');

  const references = Array.from(
    new Set([
      ...tableCardExternalReferenceCandidates(context.intentId, context.restaurantId),
      ...mercadoPagoCardExternalReferenceCandidates(context.intentId, context.restaurantId),
    ]),
  );

  for (const reference of references) {
    const url = new URL('https://api.mercadopago.com/v1/payments/search');
    url.searchParams.set('external_reference', reference);
    url.searchParams.set('sort', 'date_created');
    url.searchParams.set('criteria', 'desc');
    const { response, body } = await fetchJson<MercadoPagoSearchPayload>(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error('Não foi possível consultar o pagamento no Mercado Pago.');
    }

    const payment = (body.results || []).find(
      (candidate) =>
        String(candidate.external_reference || '').trim() === reference &&
        matchesAmount(candidate.transaction_amount, amountCents) &&
        String(candidate.currency_id || 'BRL').toUpperCase() === 'BRL',
    );
    if (payment) {
      return {
        externalId,
        status: providerStatus(payment.status),
        amountCents,
        checkoutUrl: null,
        paymentCode: null,
        expiresAt,
      };
    }
  }

  return {
    externalId,
    status: 'PENDING' as const,
    amountCents,
    checkoutUrl: null,
    paymentCode: null,
    expiresAt,
  };
}

async function getAsaasCard(
  externalId: string,
  amountCents: number,
  expiresAt: Date,
  restaurantId: number,
) {
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
      select: { totalCents: true, expiresAt: true, providerChargeId: true },
    });
    if (!intent) throw new Error('Pagamento da mesa não encontrado para consulta no provedor.');
    const amountCents = Number(intent.totalCents);
    const directPayment = await getDirectTablePayment({
      ...this.context,
      provider: this.code,
      externalId,
      amountCents,
      providerChargeId: intent.providerChargeId,
      expiresAt: intent.expiresAt,
    });
    if (directPayment) return directPayment;

    if (this.context.method === 'PIX') {
      const status = await orderPixPaymentService.getPaymentStatus({
        paymentId: externalId,
        restaurantId: this.context.restaurantId,
      });
      const normalizedStatus = status.isApproved ? 'PAID' : providerStatus(status.status);
      const hasAmount = status.amount !== null && status.amount !== undefined;
      // Uma aprovação sempre precisa trazer valor válido e correspondente à conta.
      if (
        (normalizedStatus === 'PAID' || hasAmount) &&
        (!hasAmount || !matchesAmount(status.amount, amountCents))
      ) {
        throw new Error('O valor retornado pelo Pix não corresponde à conta da mesa.');
      }
      return {
        externalId,
        status: normalizedStatus,
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
    throw new Error('Consulta de cartão não suportada para este gateway.');
  }

  private async mutatePayment(input: ProviderMutationInput, operation: 'cancel' | 'refund') {
    const intent = await prisma.tablePaymentIntent.findFirst({
      where: {
        id: this.context.intentId,
        publicId: this.context.intentPublicId,
        restaurantId: this.context.restaurantId,
        provider: this.code,
        providerExternalId: input.externalId,
      },
      select: { totalCents: true, expiresAt: true, providerChargeId: true },
    });
    if (!intent) throw new Error('Pagamento não encontrado neste restaurante.');
    return mutateDirectTablePayment(
      {
        ...this.context,
        provider: this.code,
        externalId: input.externalId,
        providerChargeId: intent.providerChargeId,
        amountCents: Number(intent.totalCents),
        expiresAt: intent.expiresAt,
      },
      operation,
      input,
    );
  }

  async cancelPayment(input: ProviderMutationInput): Promise<ProviderPayment> {
    return this.mutatePayment(input, 'cancel');
  }

  async refundPayment(input: ProviderMutationInput): Promise<ProviderPayment> {
    return this.mutatePayment(input, 'refund');
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
    throw new Error(
      'Cartão online não está configurado no painel de Pagamentos deste restaurante.',
    );
  }
  return new ConfiguredTablePaymentProvider(context, readiness.cardProvider);
}

export function createConfiguredTablePaymentProviderForExisting(
  context: ConfiguredTablePaymentProviderContext,
  provider: string,
): PaymentProvider {
  const normalized = normalizeProvider(provider);
  const supported =
    context.method === 'PIX' ? HISTORICAL_PIX.has(normalized) : HISTORICAL_CARD.has(normalized);
  if (!supported) throw new Error('Provedor deste pagamento da mesa não é suportado.');
  return new ConfiguredTablePaymentProvider(context, normalized as PixProvider | CardProvider);
}
