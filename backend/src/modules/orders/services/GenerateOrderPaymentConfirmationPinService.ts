import { PaymentMethod } from "@prisma/client";
import { io } from "../../../server.js";
import orderRepository from "../repositories/OrderRepository.js";

function generateFourDigitPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

class GenerateOrderPaymentConfirmationPinService {
  async execute(orderId: number | string, restaurantId: number) {
    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error("Pedido não encontrado!");
    }

    if (String(order.type || "").toUpperCase() !== "DELIVERY") {
      throw new Error(
        "PIN de confirmação disponível apenas para pedidos DELIVERY.",
      );
    }

    if (String(order.status || "").toUpperCase() !== "SAIU_PARA_ENTREGA") {
      throw new Error(
        "PIN de confirmação disponível apenas quando o pedido estiver em SAIU_PARA_ENTREGA.",
      );
    }

    if (order.paid === true) {
      throw new Error("Pagamento deste pedido já está confirmado.");
    }

    const digitalMethods = new Set<PaymentMethod>([
      PaymentMethod.PIX,
      PaymentMethod.CARTAO,
    ]);

    if (!order.paymentMethod || !digitalMethods.has(order.paymentMethod)) {
      throw new Error(
        "PIN de confirmação disponível apenas para PIX ou CARTAO.",
      );
    }

    const pin = generateFourDigitPin();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const updatedOrder = await orderRepository.setPaymentConfirmationPin(
      orderId,
      restaurantId,
      pin,
      expiresAt,
    );

    io.to(`restaurant:${restaurantId}`).emit("order:payment-pin-generated", {
      orderId: updatedOrder.id,
      expiresAt,
    });

    io.to(`restaurant:${restaurantId}:admin`).emit(
      "order:payment-pin-generated",
      {
        orderId: updatedOrder.id,
        expiresAt,
        pin,
      },
    );

    return {
      orderId: updatedOrder.id,
      pin,
      expiresAt,
    };
  }
}

export default new GenerateOrderPaymentConfirmationPinService();
