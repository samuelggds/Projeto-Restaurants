import { OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';
import getOrderCardPaymentStatusService from '../services/GetOrderCardPaymentStatusService.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import { OrderPaymentAttemptStatus } from '@prisma/client';
import { ONLINE_PAYMENT_EXPIRATION_MINUTES } from '../../payments/domain/onlinePaymentPolicy.js';

class OrderPixPaymentExpirationJob {
  async execute(now = new Date()) {
    const cardCutoff = new Date(
      now.getTime() - ONLINE_PAYMENT_EXPIRATION_MINUTES * 60_000,
    );
    const candidates = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDENTE,
        paid: false,
        payOnDelivery: false,
        OR: [
          {
            paymentMethod: PaymentMethod.PIX,
            pixPaymentId: { not: null },
            pixExpiresAt: { not: null, lte: now },
          },
          {
            paymentMethod: PaymentMethod.CARTAO,
            createdAt: { lte: cardCutoff },
          },
        ],
      },
      select: {
        id: true,
        publicId: true,
        userId: true,
        restaurantId: true,
        paymentMethod: true,
        pixPaymentId: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    let expiredCount = 0;
    let confirmedCount = 0;
    const failures: Error[] = [];

    for (const candidate of candidates) {
      try {
        if (candidate.paymentMethod === PaymentMethod.CARTAO) {
          const canonical = await getOrderCardPaymentStatusService.execute({
            orderPublicId: candidate.publicId,
            restaurantId: candidate.restaurantId,
            userId: candidate.userId || undefined,
          });

          if (canonical.paid === true) {
            confirmedCount += 1;
            continue;
          }

          const attempt = await orderPaymentAttemptRepository.latestForOrder(
            candidate.id,
            candidate.restaurantId,
          );
          if (
            attempt &&
            ['PENDING', 'PROCESSING'].includes(String(attempt.status || '').toUpperCase())
          ) {
            await orderPaymentAttemptRepository.update(
              attempt.id,
              candidate.restaurantId,
              OrderPaymentAttemptStatus.EXPIRED,
              {
                providerStatus: 'expired',
                failureCode: 'payment_window_expired',
                failureMessage: 'Janela de pagamento do pedido expirou.',
              },
            );
          }

          const result = await failPendingOrderPaymentService.execute({
            orderId: candidate.id,
            restaurantId: candidate.restaurantId,
          });
          if (result?.status === OrderStatus.CANCELADO) expiredCount += 1;
          continue;
        }

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
      } catch (cause) {
        failures.push(
          new Error('Order online payment expiration item failed.', {
            cause,
          }),
        );
        console.error('[ORDER_PAYMENT_EXPIRATION_ERROR]', {
          orderId: candidate.id,
          restaurantId: candidate.restaurantId,
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

export default new OrderPixPaymentExpirationJob();
