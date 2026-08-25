import { OrderRefundStatus, OrderStatus, PaymentMethod } from '@prisma/client';
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

    if (order.refundStatus === OrderRefundStatus.SUCCEEDED) {
      return true;
    }
    if (order.refundStatus === OrderRefundStatus.PROCESSING) {
      throw new Error('Estorno de pagamento tardio já está em processamento.');
    }

    const isPix = normalizedMethod === PaymentMethod.PIX;
    const isCard = normalizedMethod === PaymentMethod.CARTAO;
    if (!isPix && !isCard) {
      return false;
    }

    const pendingMarker = `late_refund_pending:${normalizedReference}`;
    const completedMarker = `late_refunded:${normalizedReference}`;
    const idempotencyKey = `late-order-refund-${order.restaurantId}-${order.id}`;
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
        ? {
            pixPaymentId: pendingMarker,
            refundStatus: OrderRefundStatus.PROCESSING,
            refundRequestedAt: new Date(),
            refundFailureReason: null,
            refundIdempotencyKey: idempotencyKey,
          }
        : {
            cardCheckoutSessionId: pendingMarker,
            refundStatus: OrderRefundStatus.PROCESSING,
            refundRequestedAt: new Date(),
            refundFailureReason: null,
            refundIdempotencyKey: idempotencyKey,
          },
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

    let receipt;
    try {
      receipt = await refundOrderPaymentService.execute(
        {
          ...order,
          paid: true,
          ...(isPix
            ? { pixPaymentId: normalizedReference }
            : { cardCheckoutSessionId: normalizedReference }),
        },
        {
          idempotencyKey,
          verifyExistingRefund: order.refundStatus === OrderRefundStatus.FAILED,
        },
      );
    } catch (error) {
      await prisma.order.updateMany({
        where: {
          id: order.id,
          restaurantId: order.restaurantId,
          refundStatus: OrderRefundStatus.PROCESSING,
          ...(isPix ? { pixPaymentId: pendingMarker } : { cardCheckoutSessionId: pendingMarker }),
        },
        data: isPix
          ? {
              pixPaymentId: order.pixPaymentId,
              refundStatus: OrderRefundStatus.FAILED,
              refundFailureReason:
                error instanceof Error
                  ? error.message
                  : 'Não foi possível confirmar o estorno do pagamento tardio.',
            }
          : {
              cardCheckoutSessionId: order.cardCheckoutSessionId,
              refundStatus: OrderRefundStatus.FAILED,
              refundFailureReason:
                error instanceof Error
                  ? error.message
                  : 'Não foi possível confirmar o estorno do pagamento tardio.',
            },
      });
      throw error;
    }

    const persisted = await prisma.order.updateMany({
      where: {
        id: order.id,
        restaurantId: order.restaurantId,
        refundStatus: OrderRefundStatus.PROCESSING,
        ...(isPix ? { pixPaymentId: pendingMarker } : { cardCheckoutSessionId: pendingMarker }),
      },
      data: isPix
        ? {
            pixPaymentId: completedMarker,
            refundStatus: OrderRefundStatus.SUCCEEDED,
            refundedAt: new Date(),
            refundFailureReason: null,
            refundProvider: receipt.provider,
            refundExternalId: receipt.externalId,
          }
        : {
            cardCheckoutSessionId: completedMarker,
            refundStatus: OrderRefundStatus.SUCCEEDED,
            refundedAt: new Date(),
            refundFailureReason: null,
            refundProvider: receipt.provider,
            refundExternalId: receipt.externalId,
          },
    });

    if (persisted.count !== 1) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      if (latest?.refundStatus !== OrderRefundStatus.SUCCEEDED) {
        console.error('[LATE_ORDER_REFUND_RECONCILIATION_REQUIRED]', {
          orderId: order.id,
          restaurantId: order.restaurantId,
          paymentMethod: normalizedMethod,
          provider: receipt.provider,
          externalId: receipt.externalId,
        });
        throw new Error(
          'O estorno tardio foi confirmado pelo provedor e aguarda conciliação. Não repita a operação.',
        );
      }
    }

    console.warn('[LATE_CANCELLED_PAYMENT_REFUNDED]', {
      orderId: order.id,
      restaurantId: order.restaurantId,
      paymentMethod: normalizedMethod,
    });
    return true;
  }
}

export default new ReconcileLateCancelledPaymentService();
