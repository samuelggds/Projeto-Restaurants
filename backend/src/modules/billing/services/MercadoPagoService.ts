import { preference } from "./MercadoPagoClient.js";
import { debug, error as logError } from "../utils/billingLogger.js";

class MercadoPagoService {
  async createPayment({ invoiceId, title, description, amount }) {
    const port = process.env.PORT || 3000;
    const notificationUrl =
      process.env.MP_NOTIFICATION_URL ||
      `http://localhost:${port}/billing/webhook/mercadopago`;
    const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    const body: any = {
      items: [
        {
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
      const response = (await preference.create({ body })) as any;

      debug("MP preference created", { id: response?.id });

      if (!response?.init_point) {
        throw new Error("Mercado Pago não retornou init_point");
      }

      debug("MP init_point generated", { invoiceId });

      return response;
    } catch (err) {
      logError("failed to create MP preference", {
        invoiceId,
        message: err?.message || String(err),
      });
      throw err;
    }
  }
}

export default new MercadoPagoService();
