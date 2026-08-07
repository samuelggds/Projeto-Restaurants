import { Request, Response } from "express";
import Stripe from "stripe";
import finalizeOrderCardPaymentService from "../services/FinalizeOrderCardPaymentService.js";
import restaurantSettingsRepository from "../../restaurantSettings/repositories/RestaurantSettingsRepository.js";

class StripeOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const allowInsecureWebhookInDev =
        process.env.ALLOW_INSECURE_STRIPE_WEBHOOK === "true";
      const allowGlobalFallback =
        process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === "true";
      const stripeSignature = String(
        req.headers["stripe-signature"] || "",
      ).trim();
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body || {}), "utf-8");
      const untrustedPayload = JSON.parse(rawBody.toString("utf-8") || "{}");
      const untrustedRestaurantId = Number(
        untrustedPayload?.data?.object?.metadata?.restaurantId || 0,
      );
      const settings =
        Number.isInteger(untrustedRestaurantId) && untrustedRestaurantId > 0
          ? await restaurantSettingsRepository.findByRestaurantId(
              untrustedRestaurantId,
            )
          : null;
      const tenantWebhookSecret = String(
        settings?.stripeWebhookSecret || "",
      ).trim();
      const globalWebhookSecret = String(
        process.env.STRIPE_WEBHOOK_SECRET || "",
      ).trim();
      const stripeWebhookSecret =
        tenantWebhookSecret ||
        (allowGlobalFallback || process.env.NODE_ENV !== "production"
          ? globalWebhookSecret
          : "");

      let eventPayload: Record<string, any> = {};

      if (stripeWebhookSecret) {
        if (!stripeSignature) {
          return res.status(400).json({
            error: "Assinatura Stripe ausente no webhook.",
          });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
        const event = stripe.webhooks.constructEvent(
          rawBody,
          stripeSignature,
          stripeWebhookSecret,
        );
        eventPayload = event as unknown as Record<string, any>;
      } else {
        if (
          process.env.NODE_ENV === "production" &&
          !allowInsecureWebhookInDev
        ) {
          return res.status(503).json({
            error:
              "Webhook Stripe indisponivel sem STRIPE_WEBHOOK_SECRET em producao.",
          });
        }

        eventPayload = untrustedPayload;
      }

      const eventType = String(eventPayload?.type || "").trim();
      const session = eventPayload?.data?.object || {};
      const sessionId = String(session?.id || "").trim();
      const paymentStatus = String(session?.payment_status || "").trim();
      const metadataOrderId = session?.metadata?.orderId || null;
      const metadataRestaurantId = Number(session?.metadata?.restaurantId || 0);

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

      if (
        !metadataOrderId ||
        !Number.isInteger(metadataRestaurantId) ||
        metadataRestaurantId <= 0
      ) {
        return res.status(400).json({
          error:
            "Webhook Stripe invalido: metadata orderId/restaurantId obrigatoria.",
        });
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
