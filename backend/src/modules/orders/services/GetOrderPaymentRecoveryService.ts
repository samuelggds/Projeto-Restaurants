import { OrderStatus, PaymentMethod } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';

type Actor = {
  userId: number | null;
  role: string;
  guestOrderId?: number | null;
  guestPublicId?: string | null;
};

function canAccess(order: {
  id: number;
  publicId: string;
  userId: number | null;
}, actor: Actor) {
  const role = String(actor.role || '').toUpperCase();
  const authenticatedCustomer =
    role === 'CLIENTE' &&
    Number(actor.userId || 0) > 0 &&
    Number(order.userId || 0) === Number(actor.userId);
  const guestCustomer =
    Number(actor.guestOrderId || 0) === Number(order.id) &&
    String(actor.guestPublicId || '') === String(order.publicId);
  return authenticatedCustomer || guestCustomer;
}

class GetOrderPaymentRecoveryService {
  async execute(publicIdInput: unknown, actor: Actor) {
    const publicId = String(publicIdInput || '').trim();
    if (!publicId) throw new Error('Pedido inválido.');

    const order = await orderRepository.findPixPaymentRecoveryByPublicId(publicId);
    if (!order || !canAccess(order, actor)) {
      throw new Error('Pedido não encontrado.');
    }

    const paymentMethod = order.paymentMethod;
    if (
      !paymentMethod ||
      ![PaymentMethod.PIX, PaymentMethod.CARTAO].includes(paymentMethod) ||
      order.payOnDelivery
    ) {
      throw new Error('Este pedido não possui pagamento online recuperável.');
    }

    const latestCardAttempt =
      paymentMethod === PaymentMethod.CARTAO
        ? await orderPaymentAttemptRepository.latestForOrder(order.id, order.restaurantId)
        : null;

    return {
      orderId: order.id,
      orderPublicId: order.publicId,
      restaurantId: order.restaurantId,
      restaurantName: order.restaurant?.name || '',
      totalAmount: Number(order.total),
      paid: order.paid === true,
      paidAt: order.paidAt,
      orderStatus: order.status,
      paymentMethod,
      canRetry:
        order.paid !== true &&
        order.status !== OrderStatus.CANCELADO &&
        paymentMethod === PaymentMethod.CARTAO,
      paymentAttempt: latestCardAttempt
        ? {
            publicId: latestCardAttempt.publicId,
            status: latestCardAttempt.status,
            provider: latestCardAttempt.provider,
            providerStatus: latestCardAttempt.providerStatus,
            providerStatusDetail: latestCardAttempt.providerStatusDetail,
            failureCode: latestCardAttempt.failureCode,
            failureMessage: latestCardAttempt.failureMessage,
            createdAt: latestCardAttempt.createdAt,
          }
        : null,
    };
  }
}

export default new GetOrderPaymentRecoveryService();
