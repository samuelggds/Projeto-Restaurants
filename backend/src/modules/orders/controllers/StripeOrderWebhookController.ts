import { Request, Response } from "express";
import finalizeOrderCardPaymentService from "../services/FinalizeOrderCardPaymentService.js";

class StripeOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const eventType = String(req.body?.type || "").trim();
      const session = req.body?.data?.object || {};
      const sessionId = String(session?.id || "").trim();
      const paymentStatus = String(session?.payment_status || "").trim();
      const metadataOrderId = session?.metadata?.orderId || null;
      const metadataRestaurantId = session?.metadata?.restaurantId || null;

      if (!sessionId) {
        return res.sendStatus(200);
      }

      const allowedEventTypes = new Set([
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
      ]);

      if (!allowedEventTypes.has(eventType) || paymentStatus !== "paid") {
        return res.sendStatus(200);
      }

      await finalizeOrderCardPaymentService.execute({
        orderId: metadataOrderId,
        checkoutSessionId: sessionId,
        restaurantId: metadataRestaurantId,
        allowMissingOrder: true,
      });

      return res.sendStatus(200);
    } catch (error: unknown) {
      console.error(
        "[ORDER_CARD_WEBHOOK_ERROR]",
        error instanceof Error ? error.message : String(error),
      );

      return res.sendStatus(500);
    }
  }
}

export default new StripeOrderWebhookController();
