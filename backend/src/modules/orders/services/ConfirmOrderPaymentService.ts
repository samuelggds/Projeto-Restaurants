import { io } from '../../../server.js';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';

class ConfirmOrderPaymentService {
  async execute(orderId: number | string | string[], restaurantId: number, role: string) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;

    if (String(role || '').toUpperCase() !== 'ADMIN') {
      throw new Error('Somente o administrador pode confirmar pagamento diretamente.');
    }

    const order = await orderRepository.findById(normalizedOrderId, restaurantId);

    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error(
        'A confirmação manual está disponível apenas para pedidos com pagamento na entrega.',
      );
    }

    if (order.paid === true) {
      return order;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const confirmedOrder = await orderRepository.confirmPayment(
        normalizedOrderId,
        restaurantId,
        tx,
      );
      await markCouponRedemptionUsedForOrder(normalizedOrderId, restaurantId, tx);
      return confirmedOrder;
    });

    io.to(`restaurant:${restaurantId}`).emit('order:payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
    });

    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:payment-confirmed', {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });

      io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });
    }

    io.to(`restaurant:${restaurantId}`).emit('new-order', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('new-order', updatedOrder);
    }

    // Reuse existing dashboard listeners that refresh order cards on this event.
    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }

    return updatedOrder;
  }
}

export default new ConfirmOrderPaymentService();
