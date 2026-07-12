import { preference } from "./MercadoPagoClient.js";
import { debug, error as logError } from "../utils/billingLogger.js";
class MercadoPagoService {
    async createPayment({ invoiceId, title, description, amount, }) {
        const isProduction = process.env.NODE_ENV === "production";
        const port = process.env.PORT || 3000;
        const backendBaseUrl = String(process.env.BACKEND_URL || "").trim();
        const fallbackNotificationUrl = backendBaseUrl
            ? `${backendBaseUrl}/billing/webhook/mercadopago`
            : `http://localhost:${port}/billing/webhook/mercadopago`;
        const notificationUrl = String(process.env.MP_NOTIFICATION_URL || fallbackNotificationUrl).trim();
        const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        if (isProduction &&
            (!notificationUrl || notificationUrl.includes("localhost"))) {
            throw new Error("Webhook Mercado Pago invalido para producao. Configure MP_NOTIFICATION_URL com uma URL publica HTTPS.");
        }
        const body = {
            items: [
                {
                    id: String(invoiceId),
                    title,
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: "BRL",
                },
            ],
            external_reference: String(invoiceId),
            additional_info: description,
            notification_url: notificationUrl,
            back_urls: {
                success: `${frontendBaseUrl}/pagamento-sucesso`,
                failure: `${frontendBaseUrl}/pagamento-erro`,
                pending: `${frontendBaseUrl}/pagamento-pendente`,
            },
        };
        debug("creating MP preference", {
            invoiceId,
            amount: Number(amount),
        });
        try {
            const response = (await preference.create({ body }));
            debug("MP preference created", { id: response?.id });
            if (!response?.init_point) {
                throw new Error("Mercado Pago não retornou init_point");
            }
            debug("MP init_point generated", { invoiceId });
            return response;
        }
        catch (err) {
            logError("failed to create MP preference", {
                invoiceId,
                message: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
}
export default new MercadoPagoService();
