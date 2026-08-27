import { OrderRefundStatus, OrderStatus } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import cancelOrderWorkflowService, {
  OrderCancellationError,
  requiresAutomaticOrderRefund,
} from './CancelOrderWorkflowService.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';

class CancelOrderService {
  async execute(orderId: number | string | string[], userId: number, restaurantId?: number | null) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const normalizedRestaurantId = Number(restaurantId || 0);
    const order = await orderRepository.findByIdForCustomer(
      normalizedOrderId,
      userId,
      normalizedRestaurantId,
    );

    if (!order) {
      throw new OrderCancellationError('Pedido não encontrado!');
    }

    if (order.userId !== userId) {
      throw new OrderCancellationError('Sem permissão!');
    }

    const orderRestaurantId = order.restaurantId;

    if (order.status === OrderStatus.CANCELADO) {
      if (
        !requiresAutomaticOrderRefund(order) ||
        order.refundStatus === OrderRefundStatus.SUCCEEDED
      ) {
        return order;
      }
      throw new OrderCancellationError(
        'Este pedido já está cancelado, mas não há confirmação persistida do estorno automático. Contate o restaurante.',
      );
    }

    const canCancel = OrderStateMachine.canTransition(order.status, OrderStatus.CANCELADO);

    if (!canCancel) {
      throw new OrderCancellationError('Pedido não pode ser cancelado!');
    }

    const { order: updatedOrder } = await cancelOrderWorkflowService.execute(order);

    notifyCustomerOrderStatusChanged({
      restaurantId: orderRestaurantId,
      customerPhone: order?.user?.phone,
      customerName: order?.user?.name,
      restaurantName: order?.restaurant?.name,
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status,
    }).catch((error) => {
      console.error('[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]', error?.message || error);
    });

    io.to(`restaurant:${orderRestaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }
    emitWaiterTableOrderEvent(io, 'order:status-changed', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);

    return updatedOrder;
  }
}

export default new CancelOrderService();
