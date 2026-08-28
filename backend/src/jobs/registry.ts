import billingJob from '../modules/billing/jobs/BillingJob.js';
import reconcileMercadoPagoInvoicesService from '../modules/billing/services/ReconcileMercadoPagoInvoicesService.js';
import loyaltyRedemptionExpirationJob from '../modules/coupon/jobs/LoyaltyRedemptionExpirationJob.js';
import deliveryLocationCleanupJob from '../modules/orders/jobs/DeliveryLocationCleanupJob.js';
import tablePaymentReservationExpirationJob from '../modules/tableAccount/jobs/TablePaymentReservationExpirationJob.js';
import type { JobDefinition } from './JobDefinition.js';

type Environment = Record<string, string | undefined>;

const MINIMUM_INTERVAL_MS = 10_000;

function boundedInteger(
  env: Environment,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(env[name] || fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} deve ser um inteiro entre ${minimum} e ${maximum}.`);
  }
  return value;
}

export function createJobDefinitions(env: Environment = process.env): JobDefinition[] {
  const timezone = String(env.JOBS_TIMEZONE || 'America/Sao_Paulo').trim();
  if (!timezone) throw new Error('JOBS_TIMEZONE não pode ser vazio.');

  const tablePaymentIntervalMs = boundedInteger(
    env,
    'TABLE_PAYMENT_EXPIRATION_INTERVAL_MS',
    60_000,
    MINIMUM_INTERVAL_MS,
    60 * 60 * 1000,
  );

  return [
    {
      key: 'billing.daily',
      description: 'Geração de faturas, renovação e bloqueios de inadimplência',
      runtime: 'worker',
      schedule: { kind: 'cron', expression: '0 0 * * *', timezone },
      leaseDurationMs: 30 * 60 * 1000,
      successCooldownMs: 20 * 60 * 60 * 1000,
      failureBackoffMs: 30 * 60 * 1000,
      runOnStart: true,
      execute: () => billingJob.execute(),
    },
    {
      key: 'billing.mercado-pago-reconciliation',
      description: 'Reconciliação automática de faturas Mercado Pago',
      runtime: 'worker',
      schedule: {
        kind: 'cron',
        expression: String(env.BILLING_MP_RECONCILE_CRON || '*/5 * * * *').trim(),
        timezone,
      },
      leaseDurationMs: 10 * 60 * 1000,
      successCooldownMs: 4 * 60 * 1000,
      failureBackoffMs: 60 * 1000,
      runOnStart: true,
      execute: () => reconcileMercadoPagoInvoicesService.execute(),
    },
    {
      key: 'coupon.loyalty-redemption-expiration',
      description: 'Expiração de resgates de fidelidade não utilizados',
      runtime: 'worker',
      schedule: {
        kind: 'cron',
        expression: String(env.LOYALTY_REDEMPTION_EXPIRATION_CRON || '*/5 * * * *').trim(),
        timezone,
      },
      leaseDurationMs: 5 * 60 * 1000,
      successCooldownMs: 4 * 60 * 1000,
      failureBackoffMs: 60 * 1000,
      execute: () => loyaltyRedemptionExpirationJob.execute(),
    },
    {
      key: 'orders.delivery-location-cleanup',
      description: 'Remoção de localizações de entrega além da retenção',
      runtime: 'worker',
      schedule: { kind: 'cron', expression: '30 3 * * *', timezone },
      leaseDurationMs: 30 * 60 * 1000,
      successCooldownMs: 20 * 60 * 60 * 1000,
      failureBackoffMs: 60 * 60 * 1000,
      execute: () => deliveryLocationCleanupJob.execute(),
    },
    {
      key: 'table-account.payment-expiration',
      description: 'Expiração de reservas de pagamento de mesa',
      // Permanece temporariamente na API porque o evento Socket.IO ainda usa
      // transporte em memória. O lease já impede duplicação entre réplicas.
      runtime: 'api',
      schedule: { kind: 'interval', intervalMs: tablePaymentIntervalMs },
      leaseDurationMs: 5 * 60 * 1000,
      successCooldownMs: Math.max(MINIMUM_INTERVAL_MS, tablePaymentIntervalMs - 5_000),
      failureBackoffMs: Math.max(MINIMUM_INTERVAL_MS, Math.floor(tablePaymentIntervalMs / 2)),
      runOnStart: true,
      execute: () => tablePaymentReservationExpirationJob.execute(),
    },
  ];
}
