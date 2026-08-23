import { OrderStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { releaseCouponRedemptionForOrder } from './couponRedemptionLifecycle.js';
import { restoreOrderItemsStock } from './restoreOrderItemsStock.js';

type FailPendingOrderPaymentPayload = {
  orderId?: number | string | null;
  restaurantId?: number | string | null;
  pixPaymentId?: string | null;
  cardCheckoutSessionId?: string | null;
};

class FailPendingOrderPaymentService {
  async execute({
    orderId,
    restaurantId,
    pixPaymentId,
    cardCheckoutSessionId,
  }: FailPendingOrderPaymentPayload) {
    const normalizedRestaurantId = Number(restaurantId || 0) || undefined;
    const normalizedPixPaymentId = String(pixPaymentId || '').trim();
    const normalizedCardSessionId = String(cardCheckoutSessionId || '').trim();
    if (!normalizedRestaurantId) {
      throw new Error('Restaurante obrigatório para reconciliar falha de pagamento.');
    }
    const order = orderId
      ? await orderRepository.findById(orderId, normalizedRestaurantId)
      : normalizedPixPaymentId
        ? await orderRepository.findByPixPaymentId(
            normalizedPixPaymentId,
            normalizedRestaurantId,
          )
        : normalizedCardSessionId
          ? await orderRepository.findByCardCheckoutSessionId(
              normalizedCardSessionId,
              normalizedRestaurantId,
            )
          : null;

    if (!order || order.paid === true || order.status === OrderStatus.CANCELADO) {
      return order;
    }

    if (order.status !== OrderStatus.PENDENTE) {
      throw new Error(
        'Falha de pagamento recebida para um pedido que já avançou na operação.',
      );
    }

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const updated = await orderRepository.updateStatusIfCurrent(
        order.id,
        OrderStatus.CANCELADO,
        order.restaurantId,
        { status: OrderStatus.PENDENTE, paid: false },
        tx,
      );
      await restoreOrderItemsStock(tx, order);
      await releaseCouponRedemptionForOrder(order.id, order.restaurantId, tx);
      return updated;
    });

    return cancelledOrder;
  }
}

export default new FailPendingOrderPaymentService();
