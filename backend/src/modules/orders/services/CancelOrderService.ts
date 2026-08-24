import { OrderStatus, PaymentMethod } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import { OrderStateMachine } from '../state/orderStateMachine.js';
import { io } from '../../../server.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import refundOrderPaymentService from './RefundOrderPaymentService.js';
import prisma from '../../../config/prisma.js';
import { restoreOrderItemsStock } from './restoreOrderItemsStock.js';
import { releaseCouponRedemptionForOrder } from './couponRedemptionLifecycle.js';
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
      throw new Error('Pedido não encontrado!');
    }

    if (order.userId !== userId) {
      throw new Error('Sem permissão!');
    }

    const orderRestaurantId = order.restaurantId;

    const canCancel = OrderStateMachine.canTransition(order.status, OrderStatus.CANCELADO);

    if (!canCancel) {
      throw new Error('Pedido não pode ser cancelado!');
    }

    const isPaidDigitalOrder =
      order.paid === true &&
      order.payOnDelivery !== true &&
      (order.paymentMethod === PaymentMethod.PIX || order.paymentMethod === PaymentMethod.CARTAO);

    if (isPaidDigitalOrder) {
      await refundOrderPaymentService.execute(order);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelledOrder = await orderRepository.updateStatusIfCurrent(
        normalizedOrderId,
        OrderStatus.CANCELADO,
        orderRestaurantId,
        { status: order.status, paid: order.paid },
        tx,
      );

      await restoreOrderItemsStock(tx, order);
      await releaseCouponRedemptionForOrder(normalizedOrderId, orderRestaurantId, tx);

      return cancelledOrder;
    });

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
    io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    emitWaiterTableOrderEvent(io, 'order:status-changed', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);

    return updatedOrder;
  }
}

export default new CancelOrderService();
