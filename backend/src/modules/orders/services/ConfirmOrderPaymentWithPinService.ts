import { io } from '../../../server.js';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import { verifyPaymentConfirmationPin } from '../utils/paymentConfirmationPin.js';
import courierAccessService from './CourierAccessService.js';

class ConfirmOrderPaymentWithPinService {
  async execute(
    orderId: number | string | string[],
    restaurantId: number,
    role: string,
    pin: string,
    actorUserId?: number | null,
  ) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const normalizedRole = String(role || '').toUpperCase();
    const allowedRoles = ['MOTOQUEIRO', 'ADMIN'];

    if (!allowedRoles.includes(normalizedRole)) {
      throw new Error(
        'A confirmação por PIN é permitida apenas para admin ou motoqueiro na entrega.',
      );
    }

    const order = await orderRepository.findById(normalizedOrderId, restaurantId);

    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    if (String(order.type || '').toUpperCase() !== 'DELIVERY') {
      throw new Error('Confirmação por PIN disponível apenas para pedidos DELIVERY.');
    }

    if (normalizedRole === 'MOTOQUEIRO') {
      const courierId = Number(actorUserId || 0);
      await courierAccessService.assertActiveCourier(courierId, restaurantId);
      if (
        String(order.status || '').toUpperCase() !== 'SAIU_PARA_ENTREGA' ||
        Number(order.assignedCourierId || 0) !== courierId
      ) {
        throw new Error('Esta entrega em andamento não está atribuída a você.');
      }
    }

    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error('Confirmação por PIN disponível apenas para pagamento na entrega.');
    }

    if (order.paid === true) {
      return order;
    }

    const normalizedPin = String(pin || '').trim();

    if (!/^\d{4}$/.test(normalizedPin)) {
      throw new Error('PIN inválido. Informe os 4 dígitos enviados por um usuário autorizado.');
    }

    if (!order.paymentConfirmationPin || !order.paymentConfirmationPinExpiresAt) {
      throw new Error('Este pedido não possui PIN ativo. Solicite um novo PIN ao dono/admin.');
    }

    if (new Date(order.paymentConfirmationPinExpiresAt).getTime() < Date.now()) {
      throw new Error('PIN expirado. Solicite um novo PIN ao dono/admin.');
    }

    if (!verifyPaymentConfirmationPin(normalizedPin, String(order.paymentConfirmationPin))) {
      throw new Error('PIN incorreto. Confira com o dono/admin.');
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
      confirmedWithPin: true,
    });

    io.to(`user:${updatedOrder.userId}`).emit('order:payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      confirmedWithPin: true,
    });

    io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
      confirmedWithPin: true,
    });

    io.to(`restaurant:${restaurantId}`).emit('new-order', updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit('new-order', updatedOrder);

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);

    return updatedOrder;
  }
}

export default new ConfirmOrderPaymentWithPinService();
