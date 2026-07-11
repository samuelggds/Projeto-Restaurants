import cron from "node-cron";
import billingJob from "../jobs/BillingJob.js";
import reconcileMercadoPagoInvoicesService from "../services/ReconcileMercadoPagoInvoicesService.js";
import { error, info } from "../utils/billingLogger.js";

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
}
