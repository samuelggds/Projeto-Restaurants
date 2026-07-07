import { PaymentMethod } from "@prisma/client";
import { io } from "../../../server.js";
import orderRepository from "../repositories/OrderRepository.js";

class ConfirmOrderPaymentService {
  async execute(
    orderId: number | string | string[],
    restaurantId: number,
    role: string,
  ) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;

    if (String(role || "").toUpperCase() === "MOTOQUEIRO") {
      throw new Error(
        "Motoqueiro não pode confirmar pagamento direto. Use o PIN do dono/admin.",
      );
    }

    const order = await orderRepository.findById(
      normalizedOrderId,
      restaurantId,
    );

    if (!order) {
      throw new Error("Pedido não encontrado!");
    }

    const digitalMethods = new Set<PaymentMethod>([
      PaymentMethod.PIX,
      PaymentMethod.CARTAO,
    ]);

    if (!order.paymentMethod || !digitalMethods.has(order.paymentMethod)) {
      throw new Error(
        "Confirmação manual de pagamento disponível apenas para PIX ou CARTAO.",
      );
    }

    if (order.paid === true) {
      return order;
    }

    const updatedOrder = await orderRepository.confirmPayment(
      normalizedOrderId,
      restaurantId,
    );

    io.to(`restaurant:${restaurantId}`).emit("order:payment-confirmed", {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
    });

    // Reuse existing dashboard listeners that refresh order cards on this event.
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

export default new ConfirmOrderPaymentService();
