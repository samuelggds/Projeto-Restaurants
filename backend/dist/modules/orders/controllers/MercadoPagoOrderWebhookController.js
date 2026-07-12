import finalizeOrderPixPaymentService from "../services/FinalizeOrderPixPaymentService.js";
import finalizeOrderCardPaymentService from "../services/FinalizeOrderCardPaymentService.js";
import { getMercadoPagoPaymentApi } from "../../payments/providers/mercadoPagoClient.js";
import orderRepository from "../repositories/OrderRepository.js";
const APPROVED_STATUSES = new Set(["approved", "accredited", "paid"]);
class MercadoPagoOrderWebhookController {
    async handle(req, res) {
        try {
            const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
            const allowGlobalFallback = process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
            const hintedRestaurantId = Number(req.query?.restaurantId || req.body?.restaurantId || 0);
            if (!paymentId) {
                return res.sendStatus(200);
            }
            if ((!Number.isInteger(hintedRestaurantId) || hintedRestaurantId <= 0) &&
                !allowGlobalFallback) {
                return res.status(400).json({
                    error: "restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant.",
                });
            }
            const paymentApi = await getMercadoPagoPaymentApi(Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
                ? hintedRestaurantId
                : undefined);
            const response = (await paymentApi.get({
                id: String(paymentId),
            }));
            const payment = typeof response === "object" && response !== null
                ? (response.body ?? response)
                : {};
            const status = String(payment.status || "").toLowerCase();
            if (!APPROVED_STATUSES.has(status)) {
                return res.sendStatus(200);
            }
            const externalReference = String(payment.external_reference || "").trim();
            const metadataRestaurantId = Number(payment.metadata
                ?.restaurant_id || 0);
            const resolvedRestaurantId = Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
                ? hintedRestaurantId
                : Number.isInteger(metadataRestaurantId) && metadataRestaurantId > 0
                    ? metadataRestaurantId
                    : undefined;
            if (externalReference.startsWith("ordercard:")) {
                const [, orderId = "", restaurantId = ""] = externalReference.split(":");
                const normalizedPaymentId = String(paymentId || "").trim();
                if (orderId) {
                    if (normalizedPaymentId) {
                        await orderRepository.setCardCheckoutSessionId(orderId, Number(restaurantId || 0), `mp_pay:${normalizedPaymentId}`);
                    }
                    await finalizeOrderCardPaymentService.execute({
                        orderId,
                        restaurantId: Number(restaurantId || 0) || undefined,
                        allowMissingOrder: true,
                    });
                }
                return res.sendStatus(200);
            }
            await finalizeOrderPixPaymentService.execute({
                paymentId: String(paymentId),
                restaurantId: resolvedRestaurantId,
                allowMissingOrder: true,
            });
            return res.sendStatus(200);
        }
        catch (error) {
            console.error("[ORDER_PIX_WEBHOOK_ERROR]", error instanceof Error ? error.message : String(error));
            return res.sendStatus(500);
        }
    }
}
export default new MercadoPagoOrderWebhookController();
