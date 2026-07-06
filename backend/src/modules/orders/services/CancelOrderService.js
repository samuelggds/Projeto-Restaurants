import { OrderStatus } from "@prisma/client";
import orderRepository from "../repositories/OrderRepository.js";
import { OrderStateMachine } from "../state/orderStateMachine.js";
import { io } from "../../../server.js";

class CancelOrderService {
  async execute(orderId, userId, restaurantId) {
    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error("Pedido não encontrado!");
    }

    if (order.userId !== userId) {
      throw new Error("Sem permissão!");
    }

    const canCancel = OrderStateMachine.canTransition(
      order.status,
      OrderStatus.CANCELADO,
    );

    if (!canCancel) {
      throw new Error("Pedido não pode ser cancelado!");
    }
    const updatedOrder = await orderRepository.updateStatus(
      orderId,
      OrderStatus.CANCELADO,
      restaurantId,
    );

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

export default new CancelOrderService();
