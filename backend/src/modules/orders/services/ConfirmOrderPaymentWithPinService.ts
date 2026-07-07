import { PaymentMethod } from "@prisma/client";
import { io } from "../../../server.js";
import orderRepository from "../repositories/OrderRepository.js";

class ConfirmOrderPaymentWithPinService {
  async execute(orderId, restaurantId, role, pin) {
    const normalizedRole = String(role || "").toUpperCase();
    const allowedRoles = ["MOTOQUEIRO", "ADMIN"];

    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error(
        "A confirmação por PIN é permitida apenas para admin ou motoqueiro na entrega.",
      );
    }

    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error("Pedido não encontrado!");
    }

    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error(
        "Confirmação por PIN disponível apenas para pedidos DELIVERY.",
      );
    }

    const digitalMethods = new Set([PaymentMethod.PIX, PaymentMethod.CARTAO]);

    if (!order.paymentMethod || !digitalMethods.has(order.paymentMethod)) {
      throw new Error(
        "Confirmação por PIN disponível apenas para PIX ou CARTAO.",
      );
    }

    if (order.paid === true) {
      return order;
    }

    const normalizedPin = String(pin || "").trim();

    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new Error(
        "PIN inválido. Informe os 4 dígitos enviados por um usuário autorizado.",
      );
    }

    if (
      !order.paymentConfirmationPin ||
      !order.paymentConfirmationPinExpiresAt
    ) {
      throw new Error(
        "Este pedido não possui PIN ativo. Solicite um novo PIN ao dono/admin.",
      );
    }

    if (
      new Date(order.paymentConfirmationPinExpiresAt).getTime() < Date.now()
    ) {
      throw new Error("PIN expirado. Solicite um novo PIN ao dono/admin.");
    }

    if (String(order.paymentConfirmationPin) !== normalizedPin) {
      throw new Error("PIN incorreto. Confira com o dono/admin.");
    }

    const updatedOrder = await orderRepository.confirmPayment(
      orderId,
      restaurantId,
    );

    io.to(`restaurant:${restaurantId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      confirmedWithPin: true,
    });

    io.to(`restaurant:${restaurantId}`).emit(
      "order:status-changed",
      updatedOrder,
    );
    io.to(`user:${updatedOrder.userId}`).emit(
      "order:status-changed",
      updatedOrder,
    );

    return updatedOrder;
  }
}

export default new ConfirmOrderPaymentWithPinService();
