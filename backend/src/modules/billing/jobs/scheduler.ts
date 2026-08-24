import cron from 'node-cron';
import billingJob from '../jobs/BillingJob.js';
import reconcileMercadoPagoInvoicesService from '../services/ReconcileMercadoPagoInvoicesService.js';
import { error, info } from '../utils/billingLogger.js';
import deliveryLocationCleanupJob from '../../orders/jobs/DeliveryLocationCleanupJob.js';
import loyaltyRedemptionExpirationJob from '../../coupon/jobs/LoyaltyRedemptionExpirationJob.js';

const scheduledTasks: Array<ReturnType<typeof cron.schedule>> = [];

function schedule(...args: Parameters<typeof cron.schedule>) {
  const task = cron.schedule(...args);
  scheduledTasks.push(task);
  return task;
}

export function startJobs() {
  if (scheduledTasks.length > 0) return;
  schedule(
    '0 0 * * *',
    async () => {
      info('scheduler triggered BillingJob');

      try {
        await billingJob.execute();
      } catch (err) {
        error('BillingJob execution failed', {
          message: err?.message || String(err),
        });
      }
    },
    {
      timezone: 'America/Sao_Paulo',
    },
  );

  schedule(
    process.env.BILLING_MP_RECONCILE_CRON || '*/5 * * * *',
    async () => {
      info('scheduler triggered MP auto reconciliation');

      try {
        await reconcileMercadoPagoInvoicesService.execute();
      } catch (err) {
        error('MP auto reconciliation execution failed', {
          message: err?.message || String(err),
        });
      }
    },
    {
      timezone: 'America/Sao_Paulo',
    },
  );

  schedule(
    process.env.LOYALTY_REDEMPTION_EXPIRATION_CRON || '*/5 * * * *',
    async () => {
      try {
        const result = await loyaltyRedemptionExpirationJob.execute();
        if (result.count > 0) {
          info('expired loyalty rewards updated', { count: result.count });
        }
      } catch (err) {
        error('loyalty reward expiration failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: 'America/Sao_Paulo' },
  );

  schedule(
    '30 3 * * *',
    async () => {
      try {
        const result = await deliveryLocationCleanupJob.execute();
        info('old delivery locations removed', { count: result.count });
      } catch (err) {
        error('delivery location cleanup failed', {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: 'America/Sao_Paulo' },
  );
}

export function stopJobs() {
  while (scheduledTasks.length) {
    const task = scheduledTasks.pop();
    task?.stop();
    task?.destroy();
  }
}
