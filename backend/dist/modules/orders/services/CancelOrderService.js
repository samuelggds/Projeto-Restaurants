import { OrderStatus, PaymentMethod } from "@prisma/client";
import orderRepository from "../repositories/OrderRepository.js";
import { OrderStateMachine } from "../state/orderStateMachine.js";
import { io } from "../../../server.js";
import { notifyCustomerOrderStatusChanged } from "../../../services/customerNotifier.js";
import refundOrderPaymentService from "./RefundOrderPaymentService.js";
import prisma from "../../../config/prisma.js";
import { restoreOrderItemsStock } from "./restoreOrderItemsStock.js";
class CancelOrderService {
    async execute(orderId, userId, restaurantId) {
        const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
        const order = await orderRepository.findById(normalizedOrderId, restaurantId);
        if (!order) {
            throw new Error("Pedido não encontrado!");
        }
        if (order.userId !== userId) {
            throw new Error("Sem permissão!");
        }
        const canCancel = OrderStateMachine.canTransition(order.status, OrderStatus.CANCELADO);
        if (!canCancel) {
            throw new Error("Pedido não pode ser cancelado!");
        }
        const isPaidDigitalOrder = order.paid === true &&
            (order.paymentMethod === PaymentMethod.PIX ||
                order.paymentMethod === PaymentMethod.CARTAO);
        if (isPaidDigitalOrder) {
            await refundOrderPaymentService.execute(order);
        }
        const updatedOrder = await prisma.$transaction(async (tx) => {
            await restoreOrderItemsStock(tx, order);
            return orderRepository.updateStatus(normalizedOrderId, OrderStatus.CANCELADO, restaurantId, tx);
        });
        notifyCustomerOrderStatusChanged({
            customerPhone: order?.user?.phone,
            customerName: order?.user?.name,
            restaurantName: order?.restaurant?.name,
            restaurantWhatsapp: order?.restaurant?.whatsapp,
            orderId: updatedOrder?.id,
            status: updatedOrder?.status,
        }).catch((error) => {
            console.error("[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]", error?.message || error);
        });
        io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
        io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
        return updatedOrder;
    }
}
export default new CancelOrderService();
