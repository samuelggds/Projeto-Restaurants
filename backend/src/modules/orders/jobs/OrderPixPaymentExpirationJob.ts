import { OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';

class OrderPixPaymentExpirationJob {
  async execute(now = new Date()) {
    const candidates = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDENTE,
        paid: false,
        paymentMethod: PaymentMethod.PIX,
        payOnDelivery: false,
        pixPaymentId: { not: null },
        pixExpiresAt: { not: null, lte: now },
      },
      select: {
        id: true,
        restaurantId: true,
        pixPaymentId: true,
      },
      orderBy: { pixExpiresAt: 'asc' },
      take: 200,
    });

    let expiredCount = 0;
    let confirmedCount = 0;
    const failures: Error[] = [];

    for (const candidate of candidates) {
      const paymentId = String(candidate.pixPaymentId || '').trim();
      if (!paymentId) continue;

      try {
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
      } catch (cause) {
        failures.push(
          new Error('Order PIX expiration item failed.', {
            cause,
          }),
        );
        console.error('[ORDER_PIX_EXPIRATION_ERROR]', {
          orderId: candidate.id,
          restaurantId: candidate.restaurantId,
          error: cause instanceof Error ? cause.name : 'UNKNOWN_ERROR',
        });
      }
    }

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        'Order PIX expiration completed with failures.',
      );
    }

    return {
      checkedCount: candidates.length,
      expiredCount,
      confirmedCount,
    };
  }
}

export default new OrderPixPaymentExpirationJob();
