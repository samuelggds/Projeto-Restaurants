import crypto from 'node:crypto';
import { io } from '../../../server.js';
import orderRepository from '../repositories/OrderRepository.js';
import { hashPaymentConfirmationPin } from '../utils/paymentConfirmationPin.js';

function generateFourDigitPin() {
  return String(crypto.randomInt(1000, 10000));
}

class GenerateOrderPaymentConfirmationPinService {
  async execute(orderId: number | string, restaurantId: number) {
    const order = await orderRepository.findById(orderId, restaurantId);

    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    if (String(order.type || '').toUpperCase() !== 'DELIVERY') {
      throw new Error('PIN de confirmação disponível apenas para pedidos DELIVERY.');
    }

    if (String(order.status || '').toUpperCase() !== 'SAIU_PARA_ENTREGA') {
      throw new Error(
        'PIN de confirmação disponível apenas quando o pedido estiver em SAIU_PARA_ENTREGA.',
      );
    }

    if (order.paid === true) {
      throw new Error('Pagamento deste pedido já está confirmado.');
    }

    if (order.payOnDelivery !== true || !order.paymentMethod) {
      throw new Error('PIN de confirmação disponível apenas para pagamento na entrega.');
    }

    const pin = generateFourDigitPin();
    const pinHash = hashPaymentConfirmationPin(pin);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const updatedOrder = await orderRepository.setPaymentConfirmationPin(
      orderId,
      restaurantId,
      pinHash,
      expiresAt,
    );

    io.to(`restaurant:${restaurantId}`).emit('order:payment-pin-generated', {
      orderId: updatedOrder.id,
      expiresAt,
    });

    io.to(`restaurant:${restaurantId}:admin`).emit('order:payment-pin-generated', {
      orderId: updatedOrder.id,
      expiresAt,
      pin,
    });

    return {
      orderId: updatedOrder.id,
      pin,
      expiresAt,
    };
  }
}

export default new GenerateOrderPaymentConfirmationPinService();
