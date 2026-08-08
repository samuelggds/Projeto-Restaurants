import { OrderStatus, OrderType, UserRole } from "@prisma/client";
import prisma from "../../../config/prisma.js";
import { io } from "../../../server.js";
import { notifyCustomerOrderStatusChanged } from "../../../services/customerNotifier.js";
import orderRepository from "../repositories/OrderRepository.js";

class ClaimOrderForDeliveryService {
  async execute({
    orderId,
    restaurantId,
    courierId,
    role,
  }: {
    orderId: number | string;
    restaurantId: number;
    courierId: number;
    role: string;
  }) {
    const normalizedOrderId = Number(orderId);
    if (String(role || "").toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error("Somente motoqueiros podem retirar pedidos para entrega.");
    }
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error("Pedido inválido.");
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const settings = await tx.restaurantSettings.findUnique({
        where: { restaurantId },
        select: { courierFeePerDelivery: true },
      });
      const courierEarning = settings?.courierFeePerDelivery || 0;

      const claimed = await tx.order.updateMany({
        where: {
          id: normalizedOrderId,
          restaurantId,
          type: OrderType.DELIVERY,
          status: OrderStatus.PRONTO,
          assignedCourierId: null,
          NOT: {
            paid: false,
            paymentMethod: { in: ["PIX", "CARTAO"] },
            payOnDelivery: false,
          },
        },
        data: {
          assignedCourierId: courierId,
          deliveryStartedAt: new Date(),
          courierEarning,
          status: OrderStatus.SAIU_PARA_ENTREGA,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.order.findFirst({
          where: { id: normalizedOrderId, restaurantId },
          select: { type: true, status: true, assignedCourierId: true },
        });
        if (!current) throw new Error("Pedido não encontrado.");
        if (current.type !== OrderType.DELIVERY)
          throw new Error("Este pedido não é uma entrega.");
        if (current.assignedCourierId)
          throw new Error("Este pedido já foi retirado por outro motoqueiro.");
        throw new Error("O pedido não está disponível para retirada.");
      }

      return orderRepository.findById(normalizedOrderId, restaurantId, tx);
    });

    if (!updatedOrder) throw new Error("Não foi possível carregar o pedido.");

    notifyCustomerOrderStatusChanged({
      customerPhone: updatedOrder.user?.phone,
      customerName: updatedOrder.user?.name,
      restaurantName: updatedOrder.restaurant?.name,
      restaurantWhatsapp: updatedOrder.restaurant?.whatsapp,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    }).catch((error: unknown) => {
      console.error(
        "[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]",
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit("order:status-changed", updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit("order:status-changed", updatedOrder);
    return updatedOrder;
  }
}

export default new ClaimOrderForDeliveryService();
