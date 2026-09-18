import { OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';

class OrderOnlinePaymentExpirationJob {
  async execute(now = new Date()) {
    const candidates = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDENTE,
        paid: false,
        payOnDelivery: false,
        paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
        onlinePaymentExpiresAt: { not: null, lte: now },
        OR: [
          { paymentMethod: PaymentMethod.PIX, pixPaymentId: { not: null } },
          { paymentMethod: PaymentMethod.CARTAO, cardCheckoutSessionId: { not: null } },
        ],
      },
      select: {
        id: true,
        restaurantId: true,
        paymentMethod: true,
        pixPaymentId: true,
        cardCheckoutSessionId: true,
      },
      orderBy: { onlinePaymentExpiresAt: 'asc' },
      take: 200,
    });

    let expiredCount = 0;
    let confirmedCount = 0;
    const failures: Error[] = [];

    for (const candidate of candidates) {
      try {
        if (candidate.paymentMethod === PaymentMethod.PIX) {
          const paymentId = String(candidate.pixPaymentId || '').trim();
          if (!paymentId) continue;

          const status = await orderPixPaymentService.getPaymentStatus({
            paymentId,
            restaurantId: candidate.restaurantId,
          });

          if (status?.isApproved === true) {
            await finalizeOrderPixPaymentService.execute({
              orderId: candidate.id,
              paymentId,
              restaurantId: candidate.restaurantId,
            });
            confirmedCount += 1;
            continue;
          }

          await orderPixPaymentService.expirePendingPixPayment({
            paymentId,
            restaurantId: candidate.restaurantId,
          });

          const result = await failPendingOrderPaymentService.execute({
            orderId: candidate.id,
            restaurantId: candidate.restaurantId,
            pixPaymentId: paymentId,
          });
          if (result?.status === OrderStatus.CANCELADO) expiredCount += 1;
          continue;
        }

        const cardCheckoutSessionId = String(candidate.cardCheckoutSessionId || '').trim();
        if (!cardCheckoutSessionId) continue;

        const result = await failPendingOrderPaymentService.execute({
          orderId: candidate.id,
          restaurantId: candidate.restaurantId,
          cardCheckoutSessionId,
        });
        if (result?.status === OrderStatus.CANCELADO) expiredCount += 1;
      } catch (cause) {
        failures.push(
          new Error('Order online payment expiration item failed.', {
            cause,
          }),
        );
        console.error('[ORDER_ONLINE_PAYMENT_EXPIRATION_ERROR]', {
          orderId: candidate.id,
          restaurantId: candidate.restaurantId,
          paymentMethod: candidate.paymentMethod,
          error: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
        });
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        'Order online payment expiration completed with failures.',
      );
    }

    return {
      checkedCount: candidates.length,
      expiredCount,
      confirmedCount,
    };
  }
}

export default new OrderOnlinePaymentExpirationJob();
