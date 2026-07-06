import cron from "node-cron";
import billingJob from "../jobs/BillingJob.js";
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
}
