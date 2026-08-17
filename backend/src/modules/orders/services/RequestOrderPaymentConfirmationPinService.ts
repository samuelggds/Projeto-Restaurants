import { UserRole } from '@prisma/client';
import { io } from '../../../server.js';
import orderRepository from '../repositories/OrderRepository.js';
import { notifyRestaurantPaymentPinRequested } from '../../../services/customerNotifier.js';

class RequestOrderPaymentConfirmationPinService {
  async execute(orderId: number | string, restaurantId: number, role: UserRole | string) {
    const normalizedRole = String(role || '').toUpperCase();
    const allowedRoles = [UserRole.MOTOQUEIRO, UserRole.ADMIN];

    if (!allowedRoles.includes(normalizedRole as (typeof allowedRoles)[number])) {
      throw new Error(
        'Somente admin ou motoqueiro podem solicitar PIN de confirmação de pagamento.',
      );
    }

    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    if (String(order.type || '').toUpperCase() !== 'DELIVERY') {
      throw new Error('Solicitação de PIN disponível apenas para pedidos DELIVERY.');
    }

    if (order.paid === true) {
      throw new Error('Pagamento deste pedido já está confirmado.');
    }

    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error('Solicitação de PIN disponível apenas para pagamento na entrega.');
    }

    const requestedAt = new Date().toISOString();

    notifyRestaurantPaymentPinRequested({
      restaurantWhatsapp: order?.restaurant?.whatsapp,
      restaurantName: order?.restaurant?.name,
      orderId: order?.id,
      requestedByRole: normalizedRole,
    }).catch((error: unknown) => {
      console.error(
        '[RESTAURANT_PIN_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit('order:payment-pin-requested', {
      orderId: order.id,
      requestedAt,
      requestedByRole: normalizedRole,
    });

    return {
      orderId: order.id,
      requestedAt,
      message: 'Solicitação de PIN enviada para o dono/admin.',
    };
  }
}

export default new RequestOrderPaymentConfirmationPinService();
