import orderRepository from "../repositories/OrderRepository.js";
import { io } from "../../../server.js";
import { OrderStateMachine } from "../state/orderStateMachine.js";
import { OrderPermissions } from "../permissions/orderPermissions.js";

class UpdateOrderStatusService {
  async execute(orderId, restaurantId, status, role) {
    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error("Pedido não encontrado!");
    }

    const currentStatus = order.status;

    const canChange = OrderStateMachine.canTransition(currentStatus, status);

    if (!canChange) {
      throw new Error(`Transição inválida: ${currentStatus} → ${status} `);
    }

    const canUserChange = OrderPermissions.canUserChangeStatus(role, status);

    if (!canUserChange) {
      throw new Error("Usuário não tem permissão para isso!");
    }

    const updatedOrder = await orderRepository.updateStatus(
      orderId,
      status,
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

export default new UpdateOrderStatusService();
