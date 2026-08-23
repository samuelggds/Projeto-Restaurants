import { io } from '../../../server.js';
import prisma from '../../../config/prisma.js';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import reconcileLateCancelledPaymentService from './ReconcileLateCancelledPaymentService.js';

type FinalizeOrderCardPaymentPayload = {
  orderId?: number | string | null;
  checkoutSessionId?: string | null;
  restaurantId?: number | null;
  allowMissingOrder?: boolean;
};

class FinalizeOrderCardPaymentService {
  async execute({
    orderId,
    checkoutSessionId,
    restaurantId,
    allowMissingOrder = false,
  }: FinalizeOrderCardPaymentPayload) {
    const normalizedCheckoutSessionId = String(checkoutSessionId || '').trim();
    const normalizedRestaurantId = Number(restaurantId || 0) || undefined;

    const order = orderId
      ? await orderRepository.findById(orderId, Number(normalizedRestaurantId || 0))
      : normalizedCheckoutSessionId
        ? await orderRepository.findByCardCheckoutSessionId(
            normalizedCheckoutSessionId,
            normalizedRestaurantId,
          )
        : null;

    if (!order) {
      if (allowMissingOrder) {
        return null;
      }

      throw new Error('Pedido do cartao nao encontrado para esta sessao.');
    }

    if (String(order.status) === 'CANCELADO' && order.paid !== true) {
      const paymentReference =
        normalizedCheckoutSessionId || String(order.cardCheckoutSessionId || '').trim();
      await reconcileLateCancelledPaymentService.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: 'CARTAO',
        paymentReference,
      });
      return orderRepository.findById(order.id, order.restaurantId);
    }

    if (order.paid === true) {
      return order;
    }

    let updatedOrder;
    try {
      updatedOrder = await prisma.$transaction(async (tx) => {
        const confirmedOrder = await orderRepository.confirmPayment(
          order.id,
          order.restaurantId,
          tx,
        );
        await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
        return confirmedOrder;
      });
    } catch (error) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      if (latest?.status === 'CANCELADO' && latest.paid !== true) {
        await reconcileLateCancelledPaymentService.execute({
          orderId: latest.id,
          restaurantId: latest.restaurantId,
          paymentMethod: 'CARTAO',
          paymentReference:
            normalizedCheckoutSessionId || String(latest.cardCheckoutSessionId || '').trim(),
        });
        return orderRepository.findById(latest.id, latest.restaurantId);
      }
      throw error;
    }

    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
    });

    io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status,
    });

    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('new-order', updatedOrder);
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:status-changed', updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);

    notifyCustomerPaymentConfirmed({
      customerPhone: updatedOrder?.user?.phone,
      customerName: updatedOrder?.user?.name,
      restaurantName: updatedOrder?.restaurant?.name,
      restaurantWhatsapp: updatedOrder?.restaurant?.whatsapp,
      orderId: updatedOrder?.id,
      total: updatedOrder?.total,
      paymentMethod: updatedOrder?.paymentMethod,
    }).catch((error: unknown) => {
      console.error(
        '[CUSTOMER_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    return updatedOrder;
  }
}

export default new FinalizeOrderCardPaymentService();
