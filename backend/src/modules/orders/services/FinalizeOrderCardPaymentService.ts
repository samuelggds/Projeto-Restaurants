import { io } from '../../../server.js';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';

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

    if (order.paid === true) {
      return order;
    }

    const updatedOrder = await orderRepository.confirmPayment(order.id, order.restaurantId);

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
