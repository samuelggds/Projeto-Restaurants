import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { getPlatformMercadoPagoAccessToken } from '../config/platformMercadoPago.js';
import { resolveMercadoPagoApiEndpoint } from '../../restaurantSettings/security/oauthEndpoints.js';
import billingRepository from '../repositories/BillingRepository.js';
import platformPlanCatalogService from './PlatformPlanCatalogService.js';
import processPaymentService from './ProcessPaymentService.js';
import { debug, error, info, warn } from '../utils/billingLogger.js';

type Profile = {
  restaurantId: number;
  providerSubscriptionId: string;
  lastPaymentId: string | null;
};

type ProviderSubscription = {
  status?: unknown;
  next_payment_date?: unknown;
  auto_recurring?: { transaction_amount?: unknown; currency_id?: unknown };
};

type AuthorizedPayment = {
  transaction_amount?: unknown;
  debit_date?: unknown;
  payment?: { id?: unknown; status?: unknown; status_detail?: unknown };
};

function moneyCents(value: unknown) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [integer, fraction = ''] = normalized.split('.');
  return BigInt(integer) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function validDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

async function providerGet(path: string) {
  const token = getPlatformMercadoPagoAccessToken();
  if (!token) return null;
  const baseUrl = resolveMercadoPagoApiEndpoint().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Mercado Pago retornou ${response.status}.`);
  return body;
}

async function providerPut(path: string, body: Record<string, unknown>) {
  const token = getPlatformMercadoPagoAccessToken();
  if (!token) return null;
  const baseUrl = resolveMercadoPagoApiEndpoint().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(`Mercado Pago retornou ${response.status}.`);
  return payload;
}

function internalProfileStatus(value: unknown) {
  const status = String(value || '').toLowerCase();
  if (status === 'authorized') return 'AUTHORIZED';
  if (status === 'paused') return 'PAUSED';
  if (status === 'canceled' || status === 'cancelled') return 'CANCELED';
  return 'ERROR';
}

export class ReconcileRecurringCardBillingService {
  async execute() {
    if (!getPlatformMercadoPagoAccessToken()) {
      warn('recurring card reconciliation skipped: missing platform MP token');
      return { processed: 0, paid: 0 };
    }

    const profiles = await prisma.$queryRaw<Profile[]>(Prisma.sql`
      SELECT "restaurantId", "providerSubscriptionId", "lastPaymentId"
      FROM "PlatformBillingProfile"
      WHERE "billingMethod" = 'CARD'
        AND "autoRenew" = true
        AND "provider" = 'MERCADO_PAGO'
        AND "providerSubscriptionId" IS NOT NULL
        AND "status" IN ('AUTHORIZED', 'ERROR')
      ORDER BY "restaurantId"
      LIMIT 200
    `);

    let paid = 0;
    const failures: Error[] = [];

    for (const profile of profiles) {
      try {
        const encodedId = encodeURIComponent(profile.providerSubscriptionId);
        const providerSubscription = (await providerGet(
          `/preapproval/${encodedId}`,
        )) as ProviderSubscription | null;
        if (!providerSubscription) continue;

        const nextBillingAt = validDate(providerSubscription.next_payment_date);
        const subscription = await billingRepository.findSubscriptionByRestaurantId(profile.restaurantId);
        if (!subscription) continue;

        if (nextBillingAt) {
          const effectivePlan =
            subscription.scheduledPlan &&
            subscription.scheduledPlanEffectiveMonth === nextBillingAt.getMonth() + 1 &&
            subscription.scheduledPlanEffectiveYear === nextBillingAt.getFullYear()
              ? subscription.scheduledPlan
              : subscription.plan;
          const plan = await platformPlanCatalogService.getByCode(effectivePlan, { activeOnly: false });
          const configuredAmount = Number(providerSubscription.auto_recurring?.transaction_amount);
          if (!Number.isFinite(configuredAmount) || Math.abs(configuredAmount - plan.monthlyFee) > 0.001) {
            await providerPut(`/preapproval/${encodedId}`, {
              auto_recurring: { transaction_amount: plan.monthlyFee, currency_id: 'BRL' },
            });
          }
        }

        const authorized = await providerGet(
          `/authorized_payments/search?preapproval_id=${encodedId}&offset=0&limit=20`,
        );
        const results = Array.isArray(authorized?.results)
          ? (authorized.results as AuthorizedPayment[])
          : [];
        const candidates = results
          .filter((item) => String(item.payment?.status || '').toLowerCase() === 'approved')
          .sort((left, right) => {
            const leftDate = validDate(left.debit_date)?.getTime() || 0;
            const rightDate = validDate(right.debit_date)?.getTime() || 0;
            return rightDate - leftDate;
          });

        for (const candidate of candidates) {
          const paymentId = String(candidate.payment?.id || '').trim();
          if (!paymentId || paymentId === profile.lastPaymentId) continue;
          const debitDate = validDate(candidate.debit_date);
          if (!debitDate) continue;

          const rangeStart = new Date(debitDate);
          rangeStart.setDate(rangeStart.getDate() - 7);
          const rangeEnd = new Date(debitDate);
          rangeEnd.setDate(rangeEnd.getDate() + 7);
          const invoice = await prisma.invoice.findFirst({
            where: {
              restaurantId: profile.restaurantId,
              status: { in: ['PENDENTE', 'ATRASADO'] },
              dueDate: { gte: rangeStart, lte: rangeEnd },
            },
            orderBy: { dueDate: 'asc' },
          });
          if (!invoice) continue;

          const expected = moneyCents(invoice.total.toString());
          const received = moneyCents(candidate.transaction_amount);
          if (expected === null || received === null || expected !== received) {
            warn('recurring card payment amount mismatch', {
              restaurantId: profile.restaurantId,
              invoiceId: invoice.id,
            });
            continue;
          }

          await processPaymentService.execute({ invoiceId: invoice.id });
          await prisma.$executeRaw(Prisma.sql`
            UPDATE "PlatformBillingProfile"
            SET "lastPaymentId" = ${paymentId},
                "lastChargeAt" = ${debitDate},
                "nextBillingAt" = ${nextBillingAt},
                "status" = ${internalProfileStatus(providerSubscription.status)},
                "lastFailureAt" = NULL,
                "lastFailureReason" = NULL,
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "restaurantId" = ${profile.restaurantId}
          `);
          paid += 1;
          break;
        }

        await prisma.$executeRaw(Prisma.sql`
          UPDATE "PlatformBillingProfile"
          SET "nextBillingAt" = ${nextBillingAt},
              "status" = ${internalProfileStatus(providerSubscription.status)},
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "restaurantId" = ${profile.restaurantId}
        `);
      } catch (cause) {
        failures.push(new Error('Recurring card reconciliation failed.', { cause }));
        error('recurring card reconciliation failed', { restaurantId: profile.restaurantId });
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "PlatformBillingProfile"
          SET "status" = 'ERROR',
              "lastFailureAt" = CURRENT_TIMESTAMP,
              "lastFailureReason" = 'Falha temporária ao conciliar a cobrança automática.',
              "updatedAt" = CURRENT_TIMESTAMP
          WHERE "restaurantId" = ${profile.restaurantId}
        `).catch(() => undefined);
      }
    }

    info('recurring card reconciliation finished', {
      processed: profiles.length,
      paid,
      failures: failures.length,
    });
    debug('recurring card billing profiles processed', { count: profiles.length });
    return { processed: profiles.length, paid, failures: failures.length };
  }
}

export default new ReconcileRecurringCardBillingService();
