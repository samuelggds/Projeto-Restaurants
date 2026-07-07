import orderRepository from "../repositories/OrderRepository.js";
import { io } from "../../../server.js";
import { OrderStateMachine } from "../state/orderStateMachine.js";
import { OrderPermissions } from "../permissions/orderPermissions.js";
import { OrderStatus, PaymentMethod, UserRole } from "@prisma/client";
import { notifyCustomerOrderStatusChanged } from "../../../services/customerNotifier.js";

class UpdateOrderStatusService {
  async execute(
    orderId: number | string,
    restaurantId: number,
    status: OrderStatus,
    role: UserRole | string,
  ) {
    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error("Pedido não encontrado!");
    }

    const currentStatus = order.status;

    const canChange = OrderStateMachine.canTransition(currentStatus, status);

    if (!canChange) {
      throw new Error(`Transição inválida: ${currentStatus} → ${status} `);
    }

    const normalizedRole = String(role || "").toUpperCase() as UserRole;
    const canUserChange = OrderPermissions.canUserChangeStatus(
      normalizedRole,
      status,
    );

    if (!canUserChange) {
      throw new Error("Usuário não tem permissão para isso!");
    }

    const digitalMethods: PaymentMethod[] = [
      PaymentMethod.PIX,
      PaymentMethod.CARTAO,
    ];
    const isDigitalPayment =
      !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);

    // PIX e cartão só podem ser entregues após a confirmação do pagamento.
    if (
      status === OrderStatus.ENTREGUE &&
      isDigitalPayment &&
      order.paid !== true
    ) {
      throw new Error(
        "Não é possível marcar como entregue: o pagamento ainda não foi confirmado.",
      );
    }

    let updatedOrder = await orderRepository.updateStatus(
      orderId,
      status,
      restaurantId,
    );

    if (
      status === OrderStatus.ENTREGUE &&
      order.paymentMethod === PaymentMethod.DINHEIRO &&
      updatedOrder?.paid !== true
    ) {
      updatedOrder = await orderRepository.confirmPayment(
        orderId,
        restaurantId,
      );

      io.to(`restaurant:${restaurantId}`).emit("order:payment-confirmed", {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });

      io.to(`user:${updatedOrder.userId}`).emit("order:payment-confirmed", {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });
    }

    notifyCustomerOrderStatusChanged({
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status,
    }).catch((error: unknown) => {
      console.error(
        "[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]",
        error instanceof Error ? error.message : String(error),
      );
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

export default new UpdateOrderStatusService();
