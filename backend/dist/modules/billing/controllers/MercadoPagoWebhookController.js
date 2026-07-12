import { MercadoPagoConfig, Payment } from "mercadopago";
import processPaymentService from "../services/ProcessPaymentService.js";
import { extractInvoiceId, isApprovedPaymentStatus, } from "../utils/webhookUtils.js";
import { debug, info, error as logError } from "../utils/billingLogger.js";
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});
class MercadoPagoWebhookController {
    async handle(req, res) {
        try {
            const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
            debug("MP webhook received", { paymentId });
            if (!paymentId) {
                debug("webhook ignored: missing paymentId");
                return res.sendStatus(200);
            }
            const paymentApi = new Payment(client);
            const payment = (await paymentApi.get({ id: paymentId }));
            const paymentDetails = typeof payment === "object" && payment !== null
                ? (payment.body ?? payment)
                : {};
            const paymentDetailsRecord = typeof paymentDetails === "object" && paymentDetails !== null
                ? paymentDetails
                : {};
            const payloadRecord = typeof req.body === "object" && req.body !== null
                ? req.body
                : {};
            const payloadData = typeof payloadRecord["data"] === "object" &&
                payloadRecord["data"] !== null
                ? payloadRecord["data"]
                : {};
            const status = paymentDetailsRecord["status"] ||
                payloadRecord["status"] ||
                payloadData["status"];
            debug("MP payment status", { status });
            if (!isApprovedPaymentStatus(status)) {
                debug("webhook ignored: payment not approved");
                return res.sendStatus(200);
            }
            const invoiceId = extractInvoiceId(payloadRecord, paymentDetailsRecord);
            debug("webhook extracted invoice", { invoiceId });
            if (!invoiceId) {
                debug("webhook ignored: missing invoiceId");
                return res.sendStatus(200);
            }
            await processPaymentService.execute({ invoiceId });
            info("webhook processed", { invoiceId });
            return res.sendStatus(200);
        }
        catch (err) {
            logError("webhook processing failed", {
                message: err instanceof Error ? err.message : String(err),
            });
            return res.sendStatus(500);
        }
    }
}
export default new MercadoPagoWebhookController();
