import { OrderStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { io } from '../../../server.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import refundOrderPaymentService from './RefundOrderPaymentService.js';
import { restoreOrderItemsStock } from './restoreOrderItemsStock.js';
import { releaseCouponRedemptionForOrder } from './couponRedemptionLifecycle.js';
import {
  getOrderIssueThread,
  resolveOrderIssueThread,
  toOrderIssueThreadPayload,
} from './orderIssueChatStore.js';

class RefundOrderByAdminService {
  async execute({
    orderId,
    restaurantId,
    adminUserId,
  }: {
    orderId: number | string;
    restaurantId: number | string | null;
    adminUserId: number | string;
  }) {
    const normalizedOrderId = Number(orderId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedAdminUserId = Number(adminUserId);

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido para estorno.');
    }

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para estorno.');
    }

    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new Error('Admin inválido para estorno.');
    }

    const [order, adminUser, issueThread] = await Promise.all([
      prisma.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId: normalizedRestaurantId,
        },
        include: {
          user: {
            select: {
              name: true,
              phone: true,
            },
          },
          restaurant: {
            select: {
              name: true,
              whatsapp: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: {
          id: normalizedAdminUserId,
        },
        select: {
          name: true,
        },
      }),
      getOrderIssueThread(normalizedOrderId),
    ]);

    if (!order) {
      throw new Error('Pedido não encontrado para este restaurante.');
    }

    if (order.status === OrderStatus.CANCELADO) {
      throw new Error('Este pedido já está cancelado.');
    }

    const wasPaid = order.paid === true;
    const hasOnlinePaymentToRefund = wasPaid && order.payOnDelivery !== true;

    if (hasOnlinePaymentToRefund) {
      await refundOrderPaymentService.execute(order);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelledOrder = await orderRepository.updateStatusIfCurrent(
        order.id,
        OrderStatus.CANCELADO,
        normalizedRestaurantId,
        { status: order.status, paid: order.paid },
        tx,
      );

      await restoreOrderItemsStock(tx, order);
      await releaseCouponRedemptionForOrder(order.id, normalizedRestaurantId, tx);

      return cancelledOrder;
    });

    const resolvedByName = String(adminUser?.name || 'Admin').trim() || 'Admin';
    const resolvedThread = await resolveOrderIssueThread({
      orderId: order.id,
      resolvedByName,
    }).catch(() => null);

    const threadPayload = toOrderIssueThreadPayload(resolvedThread);
    const resolvedPayload = threadPayload
      ? {
          orderId: order.id,
          isResolved: true,
          resolvedAt: threadPayload.resolvedAt,
          resolvedByName,
        }
      : null;

    notifyCustomerOrderStatusChanged({
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status,
    }).catch((error: unknown) => {
      console.error(
        '[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${normalizedRestaurantId}`).emit('order:status-changed', updatedOrder);
    io.to(`user:${order.userId}`).emit('order:status-changed', updatedOrder);

    if (resolvedPayload) {
      io.to(`restaurant:${normalizedRestaurantId}:admin`).emit(
        'order:issue-resolved',
        resolvedPayload,
      );
      io.to(`user:${order.userId}`).emit('order:issue-resolved', resolvedPayload);
    }

    return {
      order: updatedOrder,
      refunded: hasOnlinePaymentToRefund,
      info: hasOnlinePaymentToRefund
        ? 'Pagamento estornado e pedido cancelado com sucesso.'
        : 'Pedido cancelado com sucesso. Nenhum estorno online foi realizado.',
      issueThread: threadPayload,
    };
  }
}

export default new RefundOrderByAdminService();
