import { Request, Response } from "express";
import finalizeOrderPixPaymentService from "../services/FinalizeOrderPixPaymentService.js";
import finalizeOrderCardPaymentService from "../services/FinalizeOrderCardPaymentService.js";
import { getMercadoPagoPaymentApi } from "../../payments/providers/mercadoPagoClient.js";
import orderRepository from "../repositories/OrderRepository.js";

const APPROVED_STATUSES = new Set(["approved", "accredited", "paid"]);

class MercadoPagoOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const paymentId = req.body?.data?.id || req.body?.id || req.query?.id;
      const allowGlobalFallback =
        process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
      const hintedRestaurantId = Number(
        req.query?.restaurantId || req.body?.restaurantId || 0,
      );

      if (!paymentId) {
        return res.sendStatus(200);
      }

      if (
        (!Number.isInteger(hintedRestaurantId) || hintedRestaurantId <= 0) &&
        !allowGlobalFallback
      ) {
        return res.status(400).json({
          error:
            "restaurantId obrigatorio no webhook Mercado Pago para ambiente multi-tenant.",
        });
      }

      const paymentApi = await getMercadoPagoPaymentApi(
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
          ? hintedRestaurantId
          : undefined,
      );
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
      const metadataRestaurantId = Number(
        (payment as { metadata?: { restaurant_id?: unknown } }).metadata
          ?.restaurant_id || 0,
      );
      const resolvedRestaurantId =
        Number.isInteger(hintedRestaurantId) && hintedRestaurantId > 0
          ? hintedRestaurantId
          : Number.isInteger(metadataRestaurantId) && metadataRestaurantId > 0
            ? metadataRestaurantId
            : undefined;

      if (externalReference.startsWith("ordercard:")) {
        const [, orderId = "", restaurantId = ""] =
          externalReference.split(":");
        const referenceRestaurantId = Number(restaurantId || 0);
        const normalizedPaymentId = String(paymentId || "").trim();

        if (
          !Number.isInteger(referenceRestaurantId) ||
          referenceRestaurantId <= 0 ||
          (hintedRestaurantId > 0 &&
            referenceRestaurantId !== hintedRestaurantId) ||
          (metadataRestaurantId > 0 &&
            referenceRestaurantId !== metadataRestaurantId)
        ) {
          return res.status(400).json({
            error:
              "Webhook Mercado Pago rejeitado: restaurante da transação não confere.",
          });
        }

        if (orderId) {
          if (normalizedPaymentId) {
            await orderRepository.setCardCheckoutSessionId(
              orderId,
              referenceRestaurantId,
              `mp_pay:${normalizedPaymentId}`,
            );
          }

          await finalizeOrderCardPaymentService.execute({
            orderId,
            restaurantId: referenceRestaurantId,
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
