import { OrderStatus, PaymentMethod, type Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import failPendingOrderPaymentService from '../services/FailPendingOrderPaymentService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import orderPixPaymentService from '../services/OrderPixPaymentService.js';
import getOrderCardPaymentStatusService from '../services/GetOrderCardPaymentStatusService.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import { OrderPaymentAttemptStatus } from '@prisma/client';
import { ONLINE_PAYMENT_EXPIRATION_MINUTES } from '../../payments/domain/onlinePaymentPolicy.js';

class OrderPixPaymentExpirationJob {
  private async *candidateBatches(now: Date) {
    const cardCutoff = new Date(now.getTime() - ONLINE_PAYMENT_EXPIRATION_MINUTES * 60_000);
    const where: Prisma.OrderWhereInput = {
      status: { in: [OrderStatus.PENDENTE, OrderStatus.CANCELADO] },
      paid: false,
      payOnDelivery: false,
      OR: [
        {
          paymentMethod: PaymentMethod.PIX,
          status: OrderStatus.PENDENTE,
          pixPaymentId: { not: null },
          pixExpiresAt: { not: null, lte: now },
        },
        {
          paymentMethod: PaymentMethod.CARTAO,
          createdAt: { lte: cardCutoff },
          OR: [
            { status: OrderStatus.PENDENTE },
            {
              cardCheckoutSessionId: null,
              paymentAttempts: {
                some: {
                  provider: 'MERCADO_PAGO',
                  status: { in: ['PENDING', 'PROCESSING', 'APPROVED'] },
                },
              },
            },
          ],
        },
      ],
    };
    // Fix the sweep's upper bound so new arrivals cannot extend it indefinitely.
    // Keyset pagination advances past unresolved payments without retrying them
    // twice or starving later orders behind the same first 200 candidates.
    const ceiling = await prisma.order.findFirst({
      where,
      select: { id: true },
      orderBy: { id: 'desc' },
    });
    if (!ceiling) return;
    let afterId = 0;
    while (afterId < ceiling.id) {
      const candidates = await prisma.order.findMany({
        where: { ...where, id: { gt: afterId, lte: ceiling.id } },
        select: {
          id: true,
          publicId: true,
          userId: true,
          restaurantId: true,
          paymentMethod: true,
          pixPaymentId: true,
          tableSessionId: true,
          participantId: true,
        },
        orderBy: { id: 'asc' },
        take: 200,
      });
      if (!candidates.length) return;
      afterId = candidates[candidates.length - 1].id;
      yield candidates;
    }
  }

  async execute(now = new Date()) {
    let checkedCount = 0;
    let expiredCount = 0;
    let confirmedCount = 0;
    const failures: Error[] = [];

    for await (const candidates of this.candidateBatches(now)) {
      checkedCount += candidates.length;
      for (const candidate of candidates) {
        try {
          if (candidate.paymentMethod === PaymentMethod.CARTAO) {
            const canonical = await getOrderCardPaymentStatusService.execute({
              orderPublicId: candidate.publicId,
              restaurantId: candidate.restaurantId,
              userId: candidate.userId || undefined,
              tableSessionId: candidate.tableSessionId,
              participantId: candidate.participantId,
            });

            if (canonical.paid === true) {
              confirmedCount += 1;
              continue;
            }
            if (canonical.reconciliationPending || canonical.status === 'CANCELED') continue;

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
    }

    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        'Order online payment expiration completed with failures.',
      );
    }

    return {
      checkedCount,
      expiredCount,
      confirmedCount,
    };
  }
}

export default new OrderPixPaymentExpirationJob();
