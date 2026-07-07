import billingRepository from "../repositories/BillingRepository.js";
import processPaymentService from "../services/ProcessPaymentService.js";
import {
  extractInvoiceId,
  isApprovedPaymentStatus,
} from "../utils/webhookUtils.js";
import { debug, info, error as logError } from "../utils/billingLogger.js";

class BillingWebhookController {
  async handle(req, res) {
    try {
      const payment = req.body;

      const paymentId =
        payment.data?.id || payment.id || payment.data?.payment_id;

      debug("test webhook received", { paymentId });

      if (!paymentId) {
        debug("test webhook ignored: missing paymentId");
        return res.sendStatus(200);
      }

      const paymentStatus =
        payment.status || payment.data?.status || payment.action;
      if (!isApprovedPaymentStatus(paymentStatus)) {
        debug("test webhook ignored: payment not approved", {
          paymentStatus,
        });
        return res.sendStatus(200);
      }

      const invoiceId = extractInvoiceId(payment);

      if (!invoiceId) {
        debug("test webhook ignored: missing invoiceId");
        return res.sendStatus(200);
      }

      const invoice = await billingRepository.findInvoiceById(invoiceId);

      if (!invoice) {
        debug("test webhook ignored: invoice not found");
        return res.sendStatus(200);
      }

      if (invoice.status === "PAGO") {
        debug("test webhook ignored: invoice already paid");
        return res.sendStatus(200);
      }

      await processPaymentService.execute({ invoiceId });
      info("test webhook processed", { invoiceId });

      return res.sendStatus(200);
    } catch (error) {
      logError("test webhook failed", {
        message: error?.message || String(error),
      });

      return res.sendStatus(200);
    }
  }
}

export default new BillingWebhookController();
