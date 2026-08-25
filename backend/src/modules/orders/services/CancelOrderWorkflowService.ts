import { OrderRefundStatus, OrderStatus, PaymentMethod } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { releaseCouponRedemptionForOrder } from './couponRedemptionLifecycle.js';
import refundOrderPaymentService, {
  AutomaticRefundError,
  type RefundProviderReceipt,
} from './RefundOrderPaymentService.js';
import { restoreOrderItemsStock } from './restoreOrderItemsStock.js';

type CancellationOrder = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const DIGITAL_PAYMENT_METHODS = new Set<string>([PaymentMethod.PIX, PaymentMethod.CARTAO]);
const PAY_ON_DELIVERY_MARKER = 'PAY_ON_DELIVERY:';

export class OrderCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderCancellationError';
  }
}

export function getPublicOrderCancellationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof OrderCancellationError || error instanceof AutomaticRefundError) {
    return error.message;
  }

  return fallback;
}

export function isOrderPaidOnDelivery(order: {
  payOnDelivery?: boolean | null;
  observation?: string | null;
}) {
  return (
    order.payOnDelivery === true ||
    String(order.observation || '')
      .toUpperCase()
      .includes(PAY_ON_DELIVERY_MARKER)
  );
}

export function requiresAutomaticOrderRefund(order: {
  paid?: boolean | null;
  payOnDelivery?: boolean | null;
  paymentMethod?: PaymentMethod | string | null;
  observation?: string | null;
}) {
  return (
    order.paid === true &&
    !isOrderPaidOnDelivery(order) &&
    DIGITAL_PAYMENT_METHODS.has(String(order.paymentMethod || '').toUpperCase())
  );
}

export type CancelOrderWorkflowResult = {
  order: CancellationOrder;
  refunded: boolean;
};

class CancelOrderWorkflowService {
  private buildIdempotencyKey(order: Pick<CancellationOrder, 'id' | 'restaurantId'>) {
    return `order-refund-${order.restaurantId}-${order.id}`;
  }

  private async cancelWithoutRefund(order: CancellationOrder): Promise<CancelOrderWorkflowResult> {
    if (order.status === OrderStatus.CANCELADO) {
      return { order, refunded: false };
    }

    try {
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        const updated = await orderRepository.updateStatusIfCurrent(
          order.id,
          OrderStatus.CANCELADO,
          order.restaurantId,
          { status: order.status, paid: order.paid },
          tx,
        );

        await restoreOrderItemsStock(tx, order);
        await releaseCouponRedemptionForOrder(order.id, order.restaurantId, tx);
        return updated;
      });

      return { order: cancelledOrder as CancellationOrder, refunded: false };
    } catch (error) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      if (latest?.status === OrderStatus.CANCELADO) {
        return { order: latest as CancellationOrder, refunded: false };
      }
      throw error;
    }
  }

  private async finalizeSucceededRefund(
    order: CancellationOrder,
  ): Promise<CancelOrderWorkflowResult> {
    if (order.status === OrderStatus.CANCELADO) {
      return { order, refunded: true };
    }

    if (order.status === OrderStatus.ENTREGUE) {
      throw new OrderCancellationError(
        'O pagamento já foi estornado, mas o pedido entregue exige conciliação administrativa. Nenhuma movimentação de estoque foi realizada.',
      );
    }

    try {
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: {
            id: order.id,
            restaurantId: order.restaurantId,
            refundStatus: OrderRefundStatus.SUCCEEDED,
            status: { notIn: [OrderStatus.CANCELADO, OrderStatus.ENTREGUE] },
          },
          data: {
            status: OrderStatus.CANCELADO,
          },
        });

        if (result.count !== 1) {
          throw new OrderCancellationError('O cancelamento do pedido precisa ser conciliado.');
        }

        await restoreOrderItemsStock(tx, order);
        await releaseCouponRedemptionForOrder(order.id, order.restaurantId, tx);

        const updated = await orderRepository.findById(order.id, order.restaurantId, tx);
        if (!updated) {
          throw new OrderCancellationError('Pedido não encontrado após o cancelamento.');
        }
        return updated;
      });

      return { order: cancelledOrder as CancellationOrder, refunded: true };
    } catch (error) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      if (
        latest?.status === OrderStatus.CANCELADO &&
        latest.refundStatus === OrderRefundStatus.SUCCEEDED
      ) {
        return { order: latest as CancellationOrder, refunded: true };
      }
      throw error;
    }
  }

  private async persistRefundSucceeded(
    order: CancellationOrder,
    idempotencyKey: string,
    receipt: RefundProviderReceipt,
  ) {
    const result = await prisma.order.updateMany({
      where: {
        id: order.id,
        restaurantId: order.restaurantId,
        paid: true,
        refundStatus: OrderRefundStatus.PROCESSING,
        refundIdempotencyKey: idempotencyKey,
      },
      data: {
        refundStatus: OrderRefundStatus.SUCCEEDED,
        refundedAt: new Date(),
        refundFailureReason: null,
        refundProvider: receipt.provider,
        refundExternalId: receipt.externalId,
      },
    });

    if (result.count === 1) {
      return;
    }

    const latest = await orderRepository.findById(order.id, order.restaurantId);
    if (latest?.refundStatus === OrderRefundStatus.SUCCEEDED) {
      return;
    }

    console.error('[ORDER_REFUND_RECONCILIATION_REQUIRED]', {
      orderId: order.id,
      restaurantId: order.restaurantId,
      provider: receipt.provider,
      externalId: receipt.externalId,
    });
    throw new OrderCancellationError(
      'O provedor confirmou o estorno, mas a atualização do pedido ficou em conciliação. Não repita o estorno; contate o suporte.',
    );
  }

  private async markRefundFailed(
    order: CancellationOrder,
    idempotencyKey: string,
    error: AutomaticRefundError,
  ) {
    const result = await prisma.order.updateMany({
      where: {
        id: order.id,
        restaurantId: order.restaurantId,
        refundStatus: OrderRefundStatus.PROCESSING,
        refundIdempotencyKey: idempotencyKey,
      },
      data: {
        refundStatus: OrderRefundStatus.FAILED,
        refundFailureReason: error.message,
        refundProvider: null,
        refundExternalId: null,
      },
    });

    if (result.count !== 1) {
      console.error('[ORDER_REFUND_FAILURE_STATE_NOT_PERSISTED]', {
        orderId: order.id,
        restaurantId: order.restaurantId,
      });
    }
  }

  private async refundAndCancel(order: CancellationOrder): Promise<CancelOrderWorkflowResult> {
    if (order.refundStatus === OrderRefundStatus.SUCCEEDED) {
      return this.finalizeSucceededRefund(order);
    }

    if (order.refundStatus === OrderRefundStatus.PROCESSING) {
      throw new OrderCancellationError(
        'O estorno deste pedido já está em processamento ou aguardando conciliação. Aguarde a atualização antes de tentar novamente.',
      );
    }

    const previousRefundStatus = order.refundStatus;
    const idempotencyKey =
      String(order.refundIdempotencyKey || '').trim() || this.buildIdempotencyKey(order);
    const claim = await prisma.order.updateMany({
      where: {
        id: order.id,
        restaurantId: order.restaurantId,
        status: order.status,
        paid: true,
        refundStatus: previousRefundStatus,
      },
      data: {
        refundStatus: OrderRefundStatus.PROCESSING,
        refundRequestedAt: new Date(),
        refundFailureReason: null,
        refundIdempotencyKey: idempotencyKey,
        refundProvider: null,
        refundExternalId: null,
      },
    });

    if (claim.count !== 1) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      if (latest?.refundStatus === OrderRefundStatus.SUCCEEDED) {
        return this.finalizeSucceededRefund(latest as CancellationOrder);
      }
      if (latest?.refundStatus === OrderRefundStatus.PROCESSING) {
        throw new OrderCancellationError(
          'O estorno deste pedido já está em processamento. Aguarde a atualização antes de tentar novamente.',
        );
      }
      if (latest?.status === OrderStatus.CANCELADO) {
        throw new OrderCancellationError(
          'O pedido foi cancelado por outro processo, mas o estorno automático não está confirmado. Contate o suporte.',
        );
      }
      throw new OrderCancellationError(
        'O pedido foi atualizado por outro processo. Atualize a tela e tente novamente.',
      );
    }

    let receipt: RefundProviderReceipt;
    try {
      receipt = await refundOrderPaymentService.execute(order, {
        idempotencyKey,
        verifyExistingRefund: previousRefundStatus === OrderRefundStatus.FAILED,
      });
    } catch (error) {
      const safeError =
        error instanceof AutomaticRefundError
          ? error
          : new AutomaticRefundError(
              'O provedor de pagamento não confirmou o estorno. O pedido não foi cancelado e pode ser tentado novamente.',
            );
      await this.markRefundFailed(order, idempotencyKey, safeError);
      throw safeError;
    }

    // O sucesso financeiro é persistido antes do CAS do cancelamento. Se a etapa
    // operacional falhar, uma repetição apenas conclui o cancelamento e nunca
    // chama o provedor novamente.
    await this.persistRefundSucceeded(order, idempotencyKey, receipt);
    const refundedOrder = await orderRepository.findById(order.id, order.restaurantId);
    if (!refundedOrder) {
      throw new OrderCancellationError(
        'O estorno foi confirmado, mas o pedido precisa de conciliação. Não repita o estorno; contate o suporte.',
      );
    }
    return this.finalizeSucceededRefund(refundedOrder as CancellationOrder);
  }

  async execute(order: CancellationOrder): Promise<CancelOrderWorkflowResult> {
    if (!requiresAutomaticOrderRefund(order)) {
      return this.cancelWithoutRefund(order);
    }

    return this.refundAndCancel(order);
  }
}

export default new CancelOrderWorkflowService();
