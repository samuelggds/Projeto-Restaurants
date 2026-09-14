import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { requirePlatformMercadoPagoAccessToken } from '../../billing/config/platformMercadoPago.js';
import { resolveMercadoPagoApiEndpoint } from '../../restaurantSettings/security/oauthEndpoints.js';
import usdBrlExchangeRateService from '../../billing/services/UsdBrlExchangeRateService.js';
import aiCreditService from './AiCreditService.js';

type Actor = {
  userId: number;
  restaurantId: number;
  email: string;
};

type BillingProfileRow = {
  restaurantId: number;
  billingMethod: string;
  autoRenew: boolean;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  cardExpMonth: number | null;
  cardExpYear: number | null;
  status: string;
};

type SavedCard = {
  id?: unknown;
  last_four_digits?: unknown;
  expiration_month?: unknown;
  expiration_year?: unknown;
  payment_method?: { id?: unknown; name?: unknown } | null;
  security_code?: { length?: unknown } | null;
};

type TopUpRow = {
  publicId: string;
  restaurantId: number;
  adminUserId: number;
  requestedByUserId: number;
  creditUsdMicros: bigint;
  exchangeRateBrlPerUsd: Prisma.Decimal | string | number;
  exchangeRateSource: string;
  exchangeRateQuotedAt: Date;
  amountBrl: Prisma.Decimal | string | number;
  paymentMethod: 'PIX' | 'CARD';
  status: string;
  providerPaymentId: string | null;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  pixExpiresAt: Date | null;
  paidAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
};

function normalizeActor(actor: Actor) {
  const userId = Number(actor.userId);
  const restaurantId = Number(actor.restaurantId);
  const email = String(actor.email || '').trim();
  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(restaurantId) || restaurantId <= 0) {
    throw new Error('Conta ADMIN inválida para recarga de créditos.');
  }
  if (!email || !email.includes('@')) throw new Error('E-mail do ADMIN inválido para pagamento.');
  return { userId, restaurantId, email };
}

function normalizeUsd(value: unknown) {
  const raw = typeof value === 'string' ? value.replace(',', '.') : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Informe um valor de recarga válido.');
  if (parsed > 10_000) throw new Error('O valor máximo por recarga é US$ 10.000,00.');
  return Number(parsed.toFixed(2));
}

function microsFromUsd(value: number) {
  return BigInt(Math.round(value * 1_000_000));
}

function money(value: number) {
  return Number(value.toFixed(2));
}

function notificationUrl() {
  const explicit = String(process.env.MP_NOTIFICATION_URL || '').trim();
  if (explicit) return explicit;
  const base = String(process.env.BACKEND_URL || '').trim().replace(/\/+$/u, '');
  const url = base ? `${base}/billing/webhook/mercadopago` : '';
  if (process.env.NODE_ENV === 'production' && !/^https:\/\//iu.test(url)) {
    throw new Error('MP_NOTIFICATION_URL HTTPS é obrigatória para recargas de IA.');
  }
  return url || 'http://localhost:3000/billing/webhook/mercadopago';
}

async function providerRequest(path: string, init: RequestInit = {}) {
  const token = requirePlatformMercadoPagoAccessToken();
  const baseUrl = resolveMercadoPagoApiEndpoint().replace(/\/+$/u, '');
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
  const body = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) {
    const message = String(body.message || body.error || 'O Mercado Pago recusou a operação.');
    throw new Error(message.replace(/\b\d{13,19}\b/gu, '[cartão protegido]').slice(0, 240));
  }
  return body;
}

async function getBillingProfile(restaurantId: number) {
  const rows = await prisma.$queryRaw<BillingProfileRow[]>(Prisma.sql`
    SELECT
      "restaurantId", "billingMethod", "autoRenew", "provider", "providerCustomerId",
      "providerSubscriptionId", "cardBrand", "cardLast4", "cardExpMonth", "cardExpYear", "status"
    FROM "PlatformBillingProfile"
    WHERE "restaurantId" = ${restaurantId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function getSavedRecurringCard(restaurantId: number) {
  const profile = await getBillingProfile(restaurantId);
  if (
    !profile ||
    profile.billingMethod !== 'CARD' ||
    profile.autoRenew !== true ||
    profile.provider !== 'MERCADO_PAGO' ||
    profile.status !== 'AUTHORIZED' ||
    !profile.providerCustomerId ||
    !profile.providerSubscriptionId ||
    !profile.cardLast4
  ) {
    return null;
  }

  const cards = (await providerRequest(
    `/v1/customers/${encodeURIComponent(profile.providerCustomerId)}/cards`,
  )) as unknown;
  const list = Array.isArray(cards) ? (cards as SavedCard[]) : [];
  const matches = list.filter((card) => String(card.last_four_digits || '') === profile.cardLast4);
  const card =
    matches.find(
      (candidate) =>
        Number(candidate.expiration_month) === profile.cardExpMonth &&
        Number(candidate.expiration_year) === profile.cardExpYear,
    ) || matches[0];
  if (!card?.id) return null;

  return {
    customerId: profile.providerCustomerId,
    cardId: String(card.id),
    brand: String(card.payment_method?.id || profile.cardBrand || 'card'),
    brandLabel: String(card.payment_method?.name || profile.cardBrand || 'Cartão'),
    last4: profile.cardLast4,
    expMonth: Number(card.expiration_month || profile.cardExpMonth || 0),
    expYear: Number(card.expiration_year || profile.cardExpYear || 0),
    securityCodeLength: Number(card.security_code?.length || 3),
  };
}

function mapTopUp(row: TopUpRow) {
  return {
    publicId: row.publicId,
    creditUsd: Number((Number(row.creditUsdMicros) / 1_000_000).toFixed(2)),
    exchangeRateBrlPerUsd: Number(row.exchangeRateBrlPerUsd),
    exchangeRateSource: row.exchangeRateSource,
    exchangeRateQuotedAt: row.exchangeRateQuotedAt.toISOString(),
    amountBrl: Number(row.amountBrl),
    paymentMethod: row.paymentMethod,
    status: row.status,
    providerPaymentId: row.providerPaymentId,
    pixQrCode: row.pixQrCode,
    pixQrCodeBase64: row.pixQrCodeBase64,
    pixExpiresAt: row.pixExpiresAt?.toISOString() || null,
    paidAt: row.paidAt?.toISOString() || null,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getTopUpByPublicId(publicId: string) {
  const rows = await prisma.$queryRaw<TopUpRow[]>(Prisma.sql`
    SELECT * FROM "AiCreditTopUp" WHERE "publicId" = ${publicId} LIMIT 1
  `);
  return rows[0] ?? null;
}

async function getTopUpByPaymentId(paymentId: string) {
  const rows = await prisma.$queryRaw<TopUpRow[]>(Prisma.sql`
    SELECT * FROM "AiCreditTopUp" WHERE "providerPaymentId" = ${paymentId} LIMIT 1
  `);
  return rows[0] ?? null;
}

async function createPendingTopUp(actor: ReturnType<typeof normalizeActor>, amountUsd: number, method: 'PIX' | 'CARD') {
  const quote = await usdBrlExchangeRateService.getCurrentQuote();
  const publicId = crypto.randomUUID();
  const amountBrl = money(amountUsd * quote.rateBrlPerUsd);
  if (amountBrl <= 0) throw new Error('Valor em reais inválido para a recarga.');
  const creditUsdMicros = microsFromUsd(amountUsd);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "AiCreditTopUp" (
      "publicId", "restaurantId", "adminUserId", "requestedByUserId", "creditUsdMicros",
      "exchangeRateBrlPerUsd", "exchangeRateSource", "exchangeRateQuotedAt", "amountBrl",
      "paymentMethod", "status", "provider", "createdAt", "updatedAt"
    ) VALUES (
      ${publicId}, ${actor.restaurantId}, ${actor.userId}, ${actor.userId}, ${creditUsdMicros},
      ${quote.rateBrlPerUsd}, ${quote.source}, ${quote.quotedAt}, ${amountBrl},
      ${method}, 'PENDING', 'MERCADO_PAGO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `);

  const row = await getTopUpByPublicId(publicId);
  if (!row) throw new Error('Não foi possível registrar a recarga de créditos.');
  return row;
}

export class AiCreditTopUpService {
  async quote(amountUsdInput: unknown, restaurantId: number) {
    const amountUsd = normalizeUsd(amountUsdInput);
    const quote = await usdBrlExchangeRateService.getCurrentQuote();
    const card = await getSavedRecurringCard(restaurantId);
    return {
      creditUsd: amountUsd,
      exchangeRateBrlPerUsd: quote.rateBrlPerUsd,
      exchangeRateSource: quote.source,
      quotedAt: quote.quotedAt.toISOString(),
      amountBrl: money(amountUsd * quote.rateBrlPerUsd),
      card: card
        ? {
            available: true,
            cardId: card.cardId,
            brand: card.brand,
            brandLabel: card.brandLabel,
            last4: card.last4,
            expMonth: card.expMonth,
            expYear: card.expYear,
            securityCodeLength: card.securityCodeLength,
          }
        : { available: false },
    };
  }

  async createPix(actorInput: Actor, amountUsdInput: unknown) {
    const actor = normalizeActor(actorInput);
    const amountUsd = normalizeUsd(amountUsdInput);
    const topUp = await createPendingTopUp(actor, amountUsd, 'PIX');

    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const payment = await providerRequest('/v1/payments', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': `ai-topup-pix-${topUp.publicId}` },
        body: JSON.stringify({
          transaction_amount: Number(topUp.amountBrl),
          payment_method_id: 'pix',
          description: `Recarga de créditos IA GastroNexa - US$ ${amountUsd.toFixed(2)}`,
          external_reference: `ai-credit-topup:${topUp.publicId}`,
          notification_url: notificationUrl(),
          date_of_expiration: expiresAt,
          payer: { email: actor.email },
          metadata: { ai_credit_topup_public_id: topUp.publicId },
        }),
      });
      const transaction = payment.point_of_interaction?.transaction_data;
      if (!payment.id || !transaction?.qr_code || !transaction?.qr_code_base64) {
        throw new Error('Mercado Pago não retornou os dados do Pix da recarga.');
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp"
        SET
          "providerPaymentId" = ${String(payment.id)},
          "pixQrCode" = ${String(transaction.qr_code)},
          "pixQrCodeBase64" = ${String(transaction.qr_code_base64)},
          "pixExpiresAt" = ${new Date(payment.date_of_expiration || expiresAt)},
          "status" = ${String(payment.status || 'pending').toLowerCase() === 'approved' ? 'PAID' : 'PENDING'},
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${topUp.publicId}
      `);

      if (String(payment.status || '').toLowerCase() === 'approved') {
        await this.processPayment(String(payment.id));
      }
      const updated = await getTopUpByPublicId(topUp.publicId);
      if (!updated) throw new Error('Recarga Pix não encontrada após criação.');
      return mapTopUp(updated);
    } catch (error) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp"
        SET "status" = 'FAILED', "failureReason" = ${String(error instanceof Error ? error.message : error).slice(0, 500)}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${topUp.publicId} AND "status" <> 'PAID'
      `);
      throw error;
    }
  }

  async createCard(
    actorInput: Actor,
    input: { amountUsd: unknown; cardToken: unknown; cardId: unknown; paymentMethodId: unknown },
  ) {
    const actor = normalizeActor(actorInput);
    const amountUsd = normalizeUsd(input.amountUsd);
    const card = await getSavedRecurringCard(actor.restaurantId);
    if (!card) {
      throw new Error('Ative primeiro o cartão de renovação automática na tela Cobranças.');
    }
    if (String(input.cardId || '') !== card.cardId) {
      throw new Error('Use somente o cartão cadastrado para a renovação automática mensal.');
    }
    if (String(input.paymentMethodId || '').toLowerCase() !== card.brand.toLowerCase()) {
      throw new Error('O meio de pagamento não corresponde ao cartão cadastrado.');
    }
    const cardToken = String(input.cardToken || '').trim();
    if (cardToken.length < 8) throw new Error('Token do cartão inválido.');

    const topUp = await createPendingTopUp(actor, amountUsd, 'CARD');
    try {
      const payment = await providerRequest('/v1/payments', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': `ai-topup-card-${topUp.publicId}` },
        body: JSON.stringify({
          transaction_amount: Number(topUp.amountBrl),
          token: cardToken,
          description: `Recarga de créditos IA GastroNexa - US$ ${amountUsd.toFixed(2)}`,
          installments: 1,
          payment_method_id: card.brand,
          external_reference: `ai-credit-topup:${topUp.publicId}`,
          notification_url: notificationUrl(),
          payer: { type: 'customer', id: card.customerId, email: actor.email },
          metadata: { ai_credit_topup_public_id: topUp.publicId },
        }),
      });
      if (!payment.id) throw new Error('Mercado Pago não retornou o identificador do pagamento.');

      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp"
        SET "providerPaymentId" = ${String(payment.id)}, "status" = 'PROCESSING', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${topUp.publicId}
      `);
      await this.processPayment(String(payment.id));
      const updated = await getTopUpByPublicId(topUp.publicId);
      if (!updated) throw new Error('Recarga por cartão não encontrada após pagamento.');
      return mapTopUp(updated);
    } catch (error) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp"
        SET "status" = 'FAILED', "failureReason" = ${String(error instanceof Error ? error.message : error).slice(0, 500)}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${topUp.publicId} AND "status" <> 'PAID'
      `);
      throw error;
    }
  }

  async list(actorInput: Actor) {
    const actor = normalizeActor(actorInput);
    const rows = await prisma.$queryRaw<TopUpRow[]>(Prisma.sql`
      SELECT * FROM "AiCreditTopUp"
      WHERE "adminUserId" = ${actor.userId} AND "restaurantId" = ${actor.restaurantId}
      ORDER BY "createdAt" DESC
      LIMIT 50
    `);
    return rows.map(mapTopUp);
  }

  async processPayment(paymentIdInput: unknown) {
    const paymentId = String(paymentIdInput || '').trim();
    if (!paymentId) return { processed: false as const };

    let topUp = await getTopUpByPaymentId(paymentId);
    const payment = await providerRequest(`/v1/payments/${encodeURIComponent(paymentId)}`);
    const externalReference = String(payment.external_reference || '').trim();
    if (!externalReference.startsWith('ai-credit-topup:')) {
      return { processed: false as const };
    }
    const publicId = externalReference.slice('ai-credit-topup:'.length);
    topUp ||= await getTopUpByPublicId(publicId);
    if (!topUp || topUp.publicId !== publicId) return { processed: false as const };

    const providerAmount = Number(payment.transaction_amount);
    const expectedAmount = Number(topUp.amountBrl);
    const currency = String(payment.currency_id || 'BRL').toUpperCase();
    if (!Number.isFinite(providerAmount) || Math.abs(providerAmount - expectedAmount) > 0.009 || currency !== 'BRL') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp"
        SET "status" = 'FAILED', "failureReason" = 'Pagamento com valor ou moeda divergente.', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${topUp.publicId} AND "status" <> 'PAID'
      `);
      return { processed: true as const, status: 'FAILED', publicId: topUp.publicId };
    }

    const status = String(payment.status || '').toLowerCase();
    if (status === 'approved') {
      await aiCreditService.creditPurchase(
        { userId: topUp.adminUserId, restaurantId: topUp.restaurantId },
        { topUpPublicId: topUp.publicId, amountUsdMicros: topUp.creditUsdMicros },
      );
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "AiCreditTopUp"
        SET
          "providerPaymentId" = ${paymentId},
          "status" = 'PAID',
          "paidAt" = COALESCE("paidAt", CURRENT_TIMESTAMP),
          "failureReason" = NULL,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "publicId" = ${topUp.publicId}
      `);
      return { processed: true as const, status: 'PAID', publicId: topUp.publicId };
    }

    const nextStatus = ['cancelled', 'canceled'].includes(status)
      ? 'CANCELED'
      : status === 'rejected'
        ? 'FAILED'
        : 'PENDING';
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AiCreditTopUp"
      SET
        "providerPaymentId" = ${paymentId},
        "status" = ${nextStatus},
        "failureReason" = ${nextStatus === 'FAILED' ? String(payment.status_detail || 'Pagamento recusado.').slice(0, 500) : null},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "publicId" = ${topUp.publicId} AND "status" <> 'PAID'
    `);
    return { processed: true as const, status: nextStatus, publicId: topUp.publicId };
  }
}

export default new AiCreditTopUpService();
