import { OrderStatus, PaymentMethod } from '@prisma/client';
import { onlinePaymentExpiresAt } from '../../payments/domain/onlinePaymentPolicy.js';
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
      (paymentMethod !== PaymentMethod.PIX && paymentMethod !== PaymentMethod.CARTAO) ||
      order.payOnDelivery
    ) {
      throw new Error('Este pedido não possui pagamento online recuperável.');
    }

    const latestCardAttempt =
      paymentMethod === PaymentMethod.CARTAO
        ? await orderPaymentAttemptRepository.latestForOrder(order.id, order.restaurantId)
        : null;
    const cardExpiresAt =
      paymentMethod === PaymentMethod.CARTAO ? onlinePaymentExpiresAt(order.createdAt) : null;
    const cardRetryWindowOpen = !cardExpiresAt || cardExpiresAt.getTime() > Date.now();

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
      deliveryTime: order.restaurant?.settings?.averageDeliveryTime || null,
      deliveryAddress: [
        [order.address, order.number].filter(Boolean).join(', '),
        order.complement,
        order.district,
        [order.city, order.state].filter(Boolean).join(' - '),
      ]
        .filter(Boolean)
        .join(' - '),
      deliveryFeeAmount: Number(order.deliveryFeeAmount || 0),
      itemsSubtotal: Number(order.itemsSubtotal || 0),
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        total: Number(item.price) * item.quantity,
      })),
      canRetry:
        order.paid !== true &&
        order.status !== OrderStatus.CANCELADO &&
        paymentMethod === PaymentMethod.CARTAO &&
        cardRetryWindowOpen,
      expiresAt:
        paymentMethod === PaymentMethod.CARTAO ? cardExpiresAt : order.pixExpiresAt,
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
