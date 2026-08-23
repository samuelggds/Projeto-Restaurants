import { io } from '../../../server.js';
import prisma from '../../../config/prisma.js';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import reconcileLateCancelledPaymentService from './ReconcileLateCancelledPaymentService.js';

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

    await orderPixPaymentService.ensurePaymentApproved({
      paymentId: normalizedPaymentId,
      restaurantId,
    });

    const normalizedRestaurantId = Number(restaurantId || 0) || undefined;
    const order = orderId
      ? await orderRepository.findById(orderId, Number(normalizedRestaurantId || 0))
      : await orderRepository.findByPixPaymentId(normalizedPaymentId, normalizedRestaurantId);

    if (!order) {
      if (allowMissingOrder) {
        return null;
      }

      throw new Error('Pedido PIX nao encontrado para este pagamento.');
    }

    const storedPaymentId = String(order.pixPaymentId || '').trim();
    if (storedPaymentId !== normalizedPaymentId) {
      if (!storedPaymentId && orderId && String(order.status) !== 'CANCELADO') {
        await orderPixPaymentService.attachPaymentToOrder({
          orderId: order.id,
          restaurantId: order.restaurantId,
          paymentId: normalizedPaymentId,
        });
      } else if (String(order.status) !== 'CANCELADO') {
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

export default new FinalizeOrderPixPaymentService();
