import { Request, Response } from "express";
import finalizeOrderPixPaymentService from "../services/FinalizeOrderPixPaymentService.js";
import finalizeOrderCardPaymentService from "../services/FinalizeOrderCardPaymentService.js";
import { getMercadoPagoPaymentApi } from "../../payments/providers/mercadoPagoClient.js";

const APPROVED_STATUSES = new Set(["approved", "accredited", "paid"]);

class MercadoPagoOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;

      if (!paymentId) {
        return res.sendStatus(200);
      }

      const paymentApi = getMercadoPagoPaymentApi();
      const response = (await paymentApi.get({
        id: String(paymentId),
      })) as unknown;
      const payment =
        typeof response === "object" && response !== null
          ? ((response as { body?: unknown }).body ?? response)
          : {};

      const status = String(
        (payment as { status?: unknown }).status || "",
      ).toLowerCase();
      if (!APPROVED_STATUSES.has(status)) {
        return res.sendStatus(200);
      }

      const externalReference = String(
        (payment as { external_reference?: unknown }).external_reference || "",
      ).trim();

      if (externalReference.startsWith("ordercard:")) {
        const [, orderId = "", restaurantId = ""] =
          externalReference.split(":");

        if (orderId) {
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
        allowMissingOrder: true,
      });

      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error(
        "[ORDER_PIX_WEBHOOK_ERROR]",
        error instanceof Error ? error.message : String(error),
      );

      return res.sendStatus(500);
    }
  }
}

export default new MercadoPagoOrderWebhookController();
