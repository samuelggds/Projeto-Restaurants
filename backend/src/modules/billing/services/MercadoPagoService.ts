import { getPlatformPaymentClient } from "./MercadoPagoClient.js";
import { debug, error as logError } from "../utils/billingLogger.js";

type CreatePaymentPayload = {
  invoiceId: number | string;
  title: string;
  description: string;
  amount: number | string | { toString(): string };
  payerEmail: string;
};

export type MercadoPagoPixPayment = {
  id: string;
  status: string | null;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string | null;
  expiresAt: string | null;
};

class MercadoPagoService {
  async createPayment({
    invoiceId,
    title,
    description,
    amount,
    payerEmail,
  }: CreatePaymentPayload): Promise<MercadoPagoPixPayment> {
    const isProduction = process.env.NODE_ENV === "production";
    const port = process.env.PORT || 3000;
    const backendBaseUrl = String(process.env.BACKEND_URL || "").trim();
    const fallbackUrl = backendBaseUrl
      ? `${backendBaseUrl}/billing/webhook/mercadopago`
      : `http://localhost:${port}/billing/webhook/mercadopago`;
    const notificationUrl = String(
      process.env.MP_NOTIFICATION_URL || fallbackUrl,
    ).trim();

    if (isProduction && (!notificationUrl || notificationUrl.includes("localhost"))) {
      throw new Error(
        "Webhook Mercado Pago inválido para produção. Configure MP_NOTIFICATION_URL com uma URL pública HTTPS.",
      );
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    debug("creating Mercado Pago Pix", { invoiceId, amount: Number(amount) });

    try {
      const payment = getPlatformPaymentClient();
      const response = await payment.create({
        body: {
          transaction_amount: Number(amount),
          payment_method_id: "pix",
          description: `${title} - ${description}`,
          external_reference: String(invoiceId),
          notification_url: notificationUrl,
          date_of_expiration: expiresAt,
          payer: { email: payerEmail },
        },
        requestOptions: {
          idempotencyKey: `invoice-pix-${invoiceId}-${Date.now()}`,
        },
      });

      const transaction = response.point_of_interaction?.transaction_data;
      if (!response.id || !transaction?.qr_code || !transaction.qr_code_base64) {
        throw new Error("Mercado Pago não retornou os dados do Pix.");
      }

      return {
        id: String(response.id),
        status: response.status || null,
        qrCode: transaction.qr_code,
        qrCodeBase64: transaction.qr_code_base64,
        ticketUrl: transaction.ticket_url || null,
        expiresAt: response.date_of_expiration || expiresAt,
      };
    } catch (error: unknown) {
      logError("failed to create Mercado Pago Pix", {
        invoiceId,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default new MercadoPagoService();
