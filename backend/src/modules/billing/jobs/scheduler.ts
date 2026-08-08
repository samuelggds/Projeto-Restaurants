import cron from "node-cron";
import billingJob from "../jobs/BillingJob.js";
import reconcileMercadoPagoInvoicesService from "../services/ReconcileMercadoPagoInvoicesService.js";
import { error, info } from "../utils/billingLogger.js";
import deliveryLocationCleanupJob from "../../orders/jobs/DeliveryLocationCleanupJob.js";

export function startJobs() {
  cron.schedule(
    "0 0 * * *",
    async () => {
      info("scheduler triggered BillingJob");

      try {
        await billingJob.execute();
      } catch (err) {
        error("BillingJob execution failed", {
          message: err?.message || String(err),
        });
      }
    },
    {
      timezone: "America/Sao_Paulo",
    },
  );

  cron.schedule(
    process.env.BILLING_MP_RECONCILE_CRON || "*/5 * * * *",
    async () => {
      info("scheduler triggered MP auto reconciliation");

      try {
        await reconcileMercadoPagoInvoicesService.execute();
      } catch (err) {
        error("MP auto reconciliation execution failed", {
          message: err?.message || String(err),
        });
      }
    },
    {
      timezone: "America/Sao_Paulo",
    },
  );

  cron.schedule(
    "30 3 * * *",
    async () => {
      try {
        const result = await deliveryLocationCleanupJob.execute();
        info("old delivery locations removed", { count: result.count });
      } catch (err) {
        error("delivery location cleanup failed", {
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    { timezone: "America/Sao_Paulo" },
  );
}
