import orderRepository from "../repositories/OrderRepository.js";
import { io } from "../../../server.js";
import { OrderStateMachine } from "../state/orderStateMachine.js";
import { OrderPermissions } from "../permissions/orderPermissions.js";
import { OrderStatus, OrderType, PaymentMethod, UserRole, } from "@prisma/client";
import { notifyCustomerOrderStatusChanged } from "../../../services/customerNotifier.js";
import prisma from "../../../config/prisma.js";
import { restoreOrderItemsStock } from "./restoreOrderItemsStock.js";
class UpdateOrderStatusService {
    PAY_ON_DELIVERY_MARKER = "PAY_ON_DELIVERY:";
    hasLegacyPayOnDeliveryMarker(observation) {
        return String(observation || "")
            .toUpperCase()
            .includes(this.PAY_ON_DELIVERY_MARKER);
    }
    async execute(orderId, restaurantId, status, role, deliveryConfirmationCode) {
        const order = await orderRepository.findById(orderId, restaurantId);
        if (!order) {
            throw new Error("Pedido não encontrado!");
        }
        const currentStatus = order.status;
        const canChange = OrderStateMachine.canTransition(currentStatus, status);
        if (!canChange) {
            throw new Error(`Transição inválida: ${currentStatus} → ${status} `);
        }
        const normalizedRole = String(role || "").toUpperCase();
        const canUserChange = OrderPermissions.canUserChangeStatus(normalizedRole, status);
        if (!canUserChange) {
            throw new Error("Usuário não tem permissão para isso!");
        }
        if (status === OrderStatus.ENTREGUE &&
            normalizedRole === UserRole.MOTOQUEIRO &&
            order.type === OrderType.DELIVERY) {
            const customerPhoneDigits = String(order?.user?.phone || "").replace(/\D/g, "");
            const expectedCode = customerPhoneDigits.slice(-4);
            const providedCode = String(deliveryConfirmationCode || "").replace(/\D/g, "");
            if (!customerPhoneDigits || customerPhoneDigits.length < 4) {
                throw new Error("Não é possível confirmar a entrega: cliente sem telefone válido cadastrado.");
            }
            if (!/^\d{4}$/.test(providedCode)) {
                throw new Error("Informe os 4 últimos dígitos do celular do cliente para concluir a entrega.");
            }
            if (providedCode !== expectedCode) {
                throw new Error("Código de confirmação inválido para esta entrega.");
            }
        }
        const digitalMethods = [
            PaymentMethod.PIX,
            PaymentMethod.CARTAO,
        ];
        const isPayOnDelivery = order.payOnDelivery === true ||
            this.hasLegacyPayOnDeliveryMarker(order?.observation);
        const isDigitalPayment = !!order.paymentMethod && digitalMethods.includes(order.paymentMethod);
        // Pedidos DELIVERY só podem ser entregues após confirmação de pagamento.
        if (status === OrderStatus.ENTREGUE &&
            order.type === OrderType.DELIVERY &&
            order.paid !== true) {
            throw new Error("Não é possível marcar como entregue: o pagamento ainda não foi confirmado.");
        }
        let updatedOrder;
        if (status === OrderStatus.CANCELADO) {
            updatedOrder = await prisma.$transaction(async (tx) => {
                await restoreOrderItemsStock(tx, order);
                return orderRepository.updateStatus(orderId, status, restaurantId, tx);
            });
        }
        else {
            updatedOrder = await orderRepository.updateStatus(orderId, status, restaurantId);
        }
        notifyCustomerOrderStatusChanged({
            customerPhone: order?.user?.phone,
            customerName: order?.user?.name,
            restaurantName: order?.restaurant?.name,
            restaurantWhatsapp: order?.restaurant?.whatsapp,
            orderId: updatedOrder?.id,
            status: updatedOrder?.status,
        }).catch((error) => {
            console.error("[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]", error instanceof Error ? error.message : String(error));
        });
        io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
        io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
        return updatedOrder;
    }
}
export default new UpdateOrderStatusService();
