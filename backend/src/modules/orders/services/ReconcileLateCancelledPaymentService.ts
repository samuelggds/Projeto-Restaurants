import { OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import refundOrderPaymentService from './RefundOrderPaymentService.js';

type ReconcileLateCancelledPaymentPayload = {
  orderId: number | string;
  restaurantId: number | string;
  paymentMethod: PaymentMethod | string;
  paymentReference: string;
};

class ReconcileLateCancelledPaymentService {
  async execute({
    orderId,
    restaurantId,
    paymentMethod,
    paymentReference,
  }: ReconcileLateCancelledPaymentPayload) {
    const normalizedRestaurantId = Number(restaurantId || 0);
    const normalizedMethod = String(paymentMethod || '').toUpperCase();
    const normalizedReference = String(paymentReference || '').trim();
    if (!normalizedReference) {
      throw new Error('Pagamento tardio sem referência para estorno.');
    }

    const order = await orderRepository.findById(orderId, normalizedRestaurantId);
    if (!order || order.status !== OrderStatus.CANCELADO || order.paid === true) {
      return false;
    }

    const isPix = normalizedMethod === PaymentMethod.PIX;
    const isCard = normalizedMethod === PaymentMethod.CARTAO;
    if (!isPix && !isCard) {
      return false;
    }

    const pendingMarker = `late_refund_pending:${normalizedReference}`;
    const completedMarker = `late_refunded:${normalizedReference}`;
    const currentReference = String(
      isPix ? order.pixPaymentId || '' : order.cardCheckoutSessionId || '',
    ).trim();

    if (currentReference === completedMarker) {
      return true;
    }
    if (currentReference.startsWith('late_refund_pending:')) {
      throw new Error('Estorno de pagamento tardio já está em processamento.');
    }

    const claim = await prisma.order.updateMany({
      where: {
        id: order.id,
        restaurantId: order.restaurantId,
        status: OrderStatus.CANCELADO,
        paid: false,
        ...(isPix
          ? { pixPaymentId: order.pixPaymentId }
          : { cardCheckoutSessionId: order.cardCheckoutSessionId }),
      },
      data: isPix
        ? { pixPaymentId: pendingMarker }
        : { cardCheckoutSessionId: pendingMarker },
    });

    if (claim.count !== 1) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      const latestReference = String(
        isPix ? latest?.pixPaymentId || '' : latest?.cardCheckoutSessionId || '',
      ).trim();
      if (latestReference === completedMarker) {
        return true;
      }
      throw new Error('Não foi possível iniciar o estorno do pagamento tardio.');
    }

    try {
      await refundOrderPaymentService.execute({
        ...order,
        paid: true,
        ...(isPix
          ? { pixPaymentId: normalizedReference }
          : { cardCheckoutSessionId: normalizedReference }),
      });

      await prisma.order.updateMany({
        where: {
          id: order.id,
          restaurantId: order.restaurantId,
          ...(isPix
            ? { pixPaymentId: pendingMarker }
            : { cardCheckoutSessionId: pendingMarker }),
        },
        data: isPix
          ? { pixPaymentId: completedMarker }
          : { cardCheckoutSessionId: completedMarker },
      });

      console.warn('[LATE_CANCELLED_PAYMENT_REFUNDED]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: normalizedMethod,
      });
      return true;
    } catch (error) {
      await prisma.order.updateMany({
        where: {
          id: order.id,
          restaurantId: order.restaurantId,
          ...(isPix
            ? { pixPaymentId: pendingMarker }
            : { cardCheckoutSessionId: pendingMarker }),
        },
        data: isPix
          ? { pixPaymentId: order.pixPaymentId }
          : { cardCheckoutSessionId: order.cardCheckoutSessionId },
      });
      throw error;
    }
  }
}

export default new ReconcileLateCancelledPaymentService();
