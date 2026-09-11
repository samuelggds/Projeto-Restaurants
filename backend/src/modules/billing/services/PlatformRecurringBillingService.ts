import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { requirePlatformMercadoPagoAccessToken } from '../config/platformMercadoPago.js';
import platformPlanCatalogService from './PlatformPlanCatalogService.js';
import billingRepository from '../repositories/BillingRepository.js';
import { resolveMercadoPagoApiEndpoint } from '../../restaurantSettings/security/oauthEndpoints.js';

type ProfileRow = {
  restaurantId: number;
  billingMethod: 'PIX' | 'CARD';
  autoRenew: boolean;
  provider: string | null;
  providerSubscriptionId: string | null;
  providerCustomerId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  status: string;
  nextBillingAt: Date | null;
  lastChargeAt: Date | null;
  lastPaymentId: string | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
};

type EnableCardInput = {
  restaurantId: number;
  cardToken: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type MercadoPagoSubscription = {
  id?: unknown;
  status?: unknown;
  payer_id?: unknown;
  next_payment_date?: unknown;
  payment_method_id?: unknown;
};

function safeProviderMessage(body: Record<string, unknown>) {
  const message = String(body.message || body.error || 'O Mercado Pago recusou a operação.');
  return message.replace(/\b\d{13,19}\b/g, '[cartão protegido]').slice(0, 240);
}

function normalizeProfile(row: ProfileRow | undefined) {
  if (!row) {
    return {
      billingMethod: 'PIX' as const,
      autoRenew: false,
      provider: null,
      providerSubscriptionId: null,
      cardBrand: null,
      cardLast4: null,
      cardExpMonth: null,
      cardExpYear: null,
      status: 'INACTIVE',
      nextBillingAt: null,
      lastChargeAt: null,
      lastFailureAt: null,
      lastFailureReason: null,
    };
  }

  return {
    billingMethod: row.billingMethod,
    autoRenew: row.autoRenew,
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    cardBrand: row.cardBrand,
    cardLast4: row.cardLast4,
    cardExpMonth: row.cardExpMonth,
    cardExpYear: row.cardExpYear,
    status: row.status,
    nextBillingAt: row.nextBillingAt,
    lastChargeAt: row.lastChargeAt,
    lastFailureAt: row.lastFailureAt,
    lastFailureReason: row.lastFailureReason,
  };
}

async function providerRequest(
  path: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const token = requirePlatformMercadoPagoAccessToken();
  const baseUrl = resolveMercadoPagoApiEndpoint().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(safeProviderMessage(body));
  return body;
}

function providerStatus(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (status === 'authorized') return 'AUTHORIZED';
  if (status === 'paused') return 'PAUSED';
  if (status === 'cancelled' || status === 'canceled') return 'CANCELED';
  return 'ERROR';
}

function nextPaymentDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export class PlatformRecurringBillingService {
  async getProfile(restaurantId: number) {
    const rows = await prisma.$queryRaw<ProfileRow[]>(Prisma.sql`
      SELECT * FROM "PlatformBillingProfile" WHERE "restaurantId" = ${restaurantId} LIMIT 1
    `);
    return normalizeProfile(rows[0]);
  }

  getPublicConfig() {
    const publicKey = String(process.env.MP_PUBLIC_KEY || process.env.MERCADO_PAGO_PUBLIC_KEY || '').trim();
    if (!publicKey) {
      throw new Error('Chave pública do Mercado Pago não configurada para a mensalidade.');
    }
    return { provider: 'MERCADO_PAGO' as const, publicKey };
  }

  async enableCard(input: EnableCardInput) {
    const subscription = await billingRepository.findSubscriptionByRestaurantId(input.restaurantId);
    if (!subscription) throw new Error('Assinatura não encontrada.');
    if (subscription.status === 'CANCELADA') throw new Error('Assinatura cancelada não pode ativar renovação automática.');

    const cardToken = String(input.cardToken || '').trim();
    const brand = String(input.brand || '').trim().toLowerCase();
    const last4 = String(input.last4 || '').trim();
    if (cardToken.length < 8 || !/^[0-9]{4}$/.test(last4)) {
      throw new Error('Dados do cartão inválidos.');
    }
    if (!Number.isInteger(input.expMonth) || input.expMonth < 1 || input.expMonth > 12) {
      throw new Error('Validade do cartão inválida.');
    }
    if (!Number.isInteger(input.expYear) || input.expYear < new Date().getFullYear()) {
      throw new Error('Validade do cartão inválida.');
    }

    const plan = await platformPlanCatalogService.getByCode(subscription.plan, { activeOnly: false });
    const existing = await this.getProfile(input.restaurantId);
    const startDate = subscription.currentPeriodEnd || subscription.trialEndsAt || new Date();
    const backUrl = String(process.env.FRONTEND_URL || '').trim();
    if (process.env.NODE_ENV === 'production' && !/^https:\/\//i.test(backUrl)) {
      throw new Error('FRONTEND_URL HTTPS é obrigatória para ativar cobrança recorrente.');
    }

    let providerSubscription: MercadoPagoSubscription;
    if (existing.providerSubscriptionId && existing.status !== 'CANCELED') {
      providerSubscription = (await providerRequest(
        `/preapproval/${encodeURIComponent(existing.providerSubscriptionId)}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            card_token_id: cardToken,
            status: 'authorized',
            auto_recurring: {
              transaction_amount: plan.monthlyFee,
              currency_id: 'BRL',
            },
          }),
        },
      )) as MercadoPagoSubscription;
    } else {
      providerSubscription = (await providerRequest('/preapproval', {
        method: 'POST',
        body: JSON.stringify({
          reason: `Mensalidade GastroNexa - ${subscription.restaurant.name}`,
          external_reference: `platform-subscription:${input.restaurantId}`,
          payer_email: subscription.restaurant.email,
          card_token_id: cardToken,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            start_date: new Date(startDate).toISOString(),
            transaction_amount: plan.monthlyFee,
            currency_id: 'BRL',
          },
          back_url: backUrl || 'http://localhost:5173',
          status: 'authorized',
        }),
      })) as MercadoPagoSubscription;
    }

    const providerSubscriptionId = String(
      providerSubscription.id || existing.providerSubscriptionId || '',
    ).trim();
    if (!providerSubscriptionId) throw new Error('Mercado Pago não retornou o identificador da assinatura.');

    const status = providerStatus(providerSubscription.status || 'authorized');
    const nextBillingAt = nextPaymentDate(providerSubscription.next_payment_date) || new Date(startDate);
    const providerCustomerId = String(providerSubscription.payer_id || '').trim() || null;
    const providerBrand = String(providerSubscription.payment_method_id || brand).trim().toLowerCase();

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PlatformBillingProfile" (
        "restaurantId", "billingMethod", "autoRenew", "provider", "providerSubscriptionId",
        "providerCustomerId", "cardBrand", "cardLast4", "cardExpMonth", "cardExpYear",
        "status", "nextBillingAt", "lastFailureAt", "lastFailureReason", "updatedAt"
      ) VALUES (
        ${input.restaurantId}, 'CARD', true, 'MERCADO_PAGO', ${providerSubscriptionId},
        ${providerCustomerId}, ${providerBrand || null}, ${last4}, ${input.expMonth}, ${input.expYear},
        ${status}, ${nextBillingAt}, NULL, NULL, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("restaurantId") DO UPDATE SET
        "billingMethod" = 'CARD',
        "autoRenew" = true,
        "provider" = 'MERCADO_PAGO',
        "providerSubscriptionId" = EXCLUDED."providerSubscriptionId",
        "providerCustomerId" = EXCLUDED."providerCustomerId",
        "cardBrand" = EXCLUDED."cardBrand",
        "cardLast4" = EXCLUDED."cardLast4",
        "cardExpMonth" = EXCLUDED."cardExpMonth",
        "cardExpYear" = EXCLUDED."cardExpYear",
        "status" = EXCLUDED."status",
        "nextBillingAt" = EXCLUDED."nextBillingAt",
        "lastFailureAt" = NULL,
        "lastFailureReason" = NULL,
        "updatedAt" = CURRENT_TIMESTAMP
    `);

    return this.getProfile(input.restaurantId);
  }

  async usePix(restaurantId: number) {
    const existing = await this.getProfile(restaurantId);
    if (existing.providerSubscriptionId && existing.status === 'AUTHORIZED') {
      await providerRequest(`/preapproval/${encodeURIComponent(existing.providerSubscriptionId)}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'paused' }),
      });
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PlatformBillingProfile" (
        "restaurantId", "billingMethod", "autoRenew", "status", "updatedAt"
      ) VALUES (${restaurantId}, 'PIX', false, 'INACTIVE', CURRENT_TIMESTAMP)
      ON CONFLICT ("restaurantId") DO UPDATE SET
        "billingMethod" = 'PIX',
        "autoRenew" = false,
        "status" = CASE WHEN "PlatformBillingProfile"."providerSubscriptionId" IS NULL THEN 'INACTIVE' ELSE 'PAUSED' END,
        "updatedAt" = CURRENT_TIMESTAMP
    `);

    return this.getProfile(restaurantId);
  }
}

export default new PlatformRecurringBillingService();
