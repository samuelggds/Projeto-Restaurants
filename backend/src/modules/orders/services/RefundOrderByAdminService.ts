import { OrderRefundStatus, OrderStatus, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { io } from '../../../server.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import cancelOrderWorkflowService, {
  OrderCancellationError,
  requiresAutomaticOrderRefund,
} from './CancelOrderWorkflowService.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
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
      throw new OrderCancellationError('Pedido inválido para estorno.');
    }

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new OrderCancellationError('Restaurante inválido para estorno.');
    }

    if (!Number.isInteger(normalizedAdminUserId) || normalizedAdminUserId <= 0) {
      throw new OrderCancellationError('Admin inválido para estorno.');
    }

    const [order, adminUser, issueThread] = await Promise.all([
      orderRepository.findById(normalizedOrderId, normalizedRestaurantId),
      prisma.user.findFirst({
        where: {
          id: normalizedAdminUserId,
          restaurantId: normalizedRestaurantId,
          role: UserRole.ADMIN,
          active: true,
        },
        select: {
          name: true,
        },
      }),
      getOrderIssueThread(normalizedOrderId),
    ]);

    if (!order) {
      throw new OrderCancellationError('Pedido não encontrado para este restaurante.');
    }

    if (!adminUser) {
      throw new OrderCancellationError('Admin sem permissão para este restaurante.');
    }

    if (order.status === OrderStatus.CANCELADO) {
      const alreadyRefunded = order.refundStatus === OrderRefundStatus.SUCCEEDED;
      return {
        order,
        refunded: alreadyRefunded,
        info: alreadyRefunded
          ? 'Este pedido já está cancelado e o estorno já foi confirmado.'
          : 'Este pedido já está cancelado. Nenhum novo estorno foi solicitado.',
        issueThread: toOrderIssueThreadPayload(issueThread),
      };
    }

    if (order.status === OrderStatus.ENTREGUE) {
      throw new OrderCancellationError(
        'Pedidos já entregues não podem ser cancelados ou estornados por este fluxo. Abra uma conciliação financeira.',
      );
    }

    const hasOnlinePaymentToRefund = requiresAutomaticOrderRefund(order);
    const { order: updatedOrder, refunded } = await cancelOrderWorkflowService.execute(order);

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
      restaurantId: normalizedRestaurantId,
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
    emitWaiterTableOrderEvent(io, 'waiter:order-updated', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);

    if (resolvedPayload) {
      io.to(`restaurant:${normalizedRestaurantId}:admin`).emit(
        'order:issue-resolved',
        resolvedPayload,
      );
      io.to(`user:${order.userId}`).emit('order:issue-resolved', resolvedPayload);
    }

    return {
      order: updatedOrder,
      refunded,
      info: refunded
        ? 'Pagamento estornado e pedido cancelado com sucesso.'
        : hasOnlinePaymentToRefund
          ? 'Pedido cancelado, mas nenhum estorno online foi necessário.'
          : 'Pedido cancelado com sucesso. Nenhum estorno online foi realizado.',
      issueThread: threadPayload,
    };
  }
}

export default new RefundOrderByAdminService();
