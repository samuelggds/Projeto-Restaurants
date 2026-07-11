import { Request, Response } from "express";
import prisma from "../../../config/prisma.js";
import { io } from "../../../server.js";
import orderRepository from "../repositories/OrderRepository.js";

export interface AsaasWebhookPaymentPayload {
  id: string;
  externalReference: string;
  value: number;
  walletId: string;
}

export interface AsaasWebhookPayload {
  event: string;
  payment: AsaasWebhookPaymentPayload;
}

class AsaasOrderWebhookController {
  async handle(req: Request, res: Response) {
    try {
      const tokenFromHeader = String(
        req.header("asaas-access-token") || "",
      ).trim();
      const expectedToken = String(
        process.env.ASAAS_WEBHOOK_TOKEN || "",
      ).trim();

      if (!expectedToken || tokenFromHeader !== expectedToken) {
        return res.status(401).json({ error: "Token de webhook invalido." });
      }

      const payload = req.body as AsaasWebhookPayload;
      const event = String(payload?.event || "")
        .trim()
        .toUpperCase();

      if (event !== "PAYMENT_RECEIVED") {
        return res.status(200).json({ received: true, ignored: true });
      }

      const payment = payload?.payment;
      const externalReference = String(payment?.externalReference || "").trim();
      const asaasPaymentId = String(payment?.id || "").trim();
      const paymentValue = Number(payment?.value);
      const walletId = String(payment?.walletId || "").trim();

      const hasRequiredPaymentFields =
        Boolean(asaasPaymentId) &&
        Boolean(externalReference) &&
        Number.isFinite(paymentValue) &&
        paymentValue >= 0 &&
        Boolean(walletId);

      if (!hasRequiredPaymentFields) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const orderId = Number(externalReference);
      if (!Number.isInteger(orderId) || orderId <= 0) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const order = await prisma.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          restaurantId: true,
          userId: true,
          paid: true,
          paymentMethod: true,
          pixPaymentId: true,
        },
      });

      if (!order) {
        return res.status(200).json({ received: true, ignored: true });
      }

      const normalizedPaymentMethod = String(order.paymentMethod || "")
        .trim()
        .toUpperCase();

      const isSupportedAutomaticMethod =
        normalizedPaymentMethod === "PIX" ||
        normalizedPaymentMethod === "CARTAO";

      if (!isSupportedAutomaticMethod) {
        return res.status(200).json({ received: true, ignored: true });
      }

      if (!order.paid) {
        if (asaasPaymentId && !String(order.pixPaymentId || "").trim()) {
          await prisma.order.update({
            where: {
              id: order.id,
            },
            data: {
              pixPaymentId: asaasPaymentId,
            },
          });
        }

        const updatedOrder = await orderRepository.confirmPayment(
          order.id,
          order.restaurantId,
        );

        io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
          "order:payment-confirmed",
          {
            orderId: updatedOrder.id,
            paid: true,
            paymentMethod: updatedOrder.paymentMethod,
          },
        );

        io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
          "new-order",
          updatedOrder,
        );

        io.to(`restaurant:${updatedOrder.restaurantId}`).emit(
          "order:status-changed",
          updatedOrder,
        );

        io.to(`restaurant:${updatedOrder.restaurantId}:kitchen`).emit(
          "kitchen:order-paid",
          {
            orderId: updatedOrder.id,
            restaurantId: updatedOrder.restaurantId,
            paid: true,
          },
        );

        io.to(`user:${updatedOrder.userId}`).emit("payment-confirmed", {
          orderId: updatedOrder.id,
          paid: true,
          paymentMethod: updatedOrder.paymentMethod,
          status: updatedOrder.status,
        });
      }

      return res.status(200).json({ received: true, processed: true });
    } catch (error: unknown) {
      console.error(
        "[ASAAS_WEBHOOK_ERROR]",
        error instanceof Error ? error.message : String(error),
      );

      // Return 200 to avoid unnecessary retries for non-auth errors.
      return res.status(200).json({ received: true, processed: false });
    }
  }
}

export default new AsaasOrderWebhookController();
