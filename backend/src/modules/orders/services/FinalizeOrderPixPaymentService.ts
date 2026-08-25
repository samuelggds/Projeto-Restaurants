import { io } from '../../../server.js';
import prisma from '../../../config/prisma.js';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import reconcileLateCancelledPaymentService from './ReconcileLateCancelledPaymentService.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';

type FinalizeOrderPixPaymentPayload = {
  orderId?: number | string | null;
  paymentId: string;
  restaurantId?: number | null;
  allowMissingOrder?: boolean;
};

class FinalizeOrderPixPaymentService {
  async execute({
    orderId,
    paymentId,
    restaurantId,
    allowMissingOrder = false,
  }: FinalizeOrderPixPaymentPayload) {
    const normalizedPaymentId = String(paymentId || '').trim();

    if (!normalizedPaymentId) {
      throw new Error('Pagamento PIX invalido.');
    }

    if (normalizedPaymentId.startsWith('manual:')) {
      throw new Error('Pagamento PIX manual nao e permitido.');
    }

    const normalizedRestaurantId = Number(restaurantId || 0) || undefined;
    const existingPaymentOrder = await orderRepository.findByPixPaymentId(normalizedPaymentId);
    if (existingPaymentOrder && orderId && existingPaymentOrder.id !== Number(orderId)) {
      throw new Error('Este pagamento PIX já foi utilizado em outro pedido.');
    }

    const order = orderId
      ? await orderRepository.findById(orderId, Number(normalizedRestaurantId || 0))
      : existingPaymentOrder;

    if (!order) {
      if (allowMissingOrder) {
        return null;
      }

      throw new Error('Pedido PIX nao encontrado para este pagamento.');
    }

    if (normalizedRestaurantId && order.restaurantId !== normalizedRestaurantId) {
      throw new Error('Este pagamento PIX não pertence ao restaurante do pedido.');
    }

    await orderPixPaymentService.ensurePaymentApproved({
      paymentId: normalizedPaymentId,
      restaurantId: order.restaurantId,
      expectedOrderId: order.id,
      expectedAmount: Number(order.total),
      expectedCurrency: 'BRL',
    });

    const storedPaymentId = String(order.pixPaymentId || '').trim();
    if (storedPaymentId !== normalizedPaymentId) {
      if (storedPaymentId && String(order.status) !== 'CANCELADO') {
        throw new Error('Pagamento PIX nao corresponde ao pedido informado.');
      }
    }

    if (String(order.status) === 'CANCELADO' && order.paid !== true) {
      await reconcileLateCancelledPaymentService.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: 'PIX',
        paymentReference: normalizedPaymentId,
      });
      return orderRepository.findById(order.id, order.restaurantId);
    }

    if (order.paid === true) {
      return order;
    }

    let updatedOrder;
    try {
      updatedOrder = await prisma.$transaction(async (tx) => {
        await orderRepository.claimPixPaymentId(
          order.id,
          order.restaurantId,
          normalizedPaymentId,
          tx,
        );
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
          paymentMethod: 'PIX',
          paymentReference: normalizedPaymentId,
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
    emitTableSessionOrderEvent(io, 'order:payment-confirmed', updatedOrder);

    io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      status: updatedOrder.status,
    });

    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('new-order', updatedOrder);
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:status-changed', updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    emitWaiterTableOrderEvent(io, 'new-order', updatedOrder);
    emitTableSessionOrderEvent(io, 'new-order', updatedOrder);
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);

    notifyCustomerPaymentConfirmed({
      restaurantId: updatedOrder.restaurantId,
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

export default new FinalizeOrderPixPaymentService();
