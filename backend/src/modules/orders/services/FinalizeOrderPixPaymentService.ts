import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import prisma from '../../../config/prisma.js';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import paymentTerminalRepository from '../../paymentTerminals/repositories/PaymentTerminalRepository.js';
import pickupPaymentService from '../../pickupPayments/services/PickupPaymentService.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import reconcileLateCancelledPaymentService from './ReconcileLateCancelledPaymentService.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
import { safeErrorSummary } from '../../../services/telemetrySanitizer.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  releaseTableOrderingInTransaction,
  publishTableOrderingRelease,
  reconcileTableOrderingAfterCommit,
} from './tableOrderingLifecycle.js';
import {
  isOrderCapacityQueued,
  queueDigitalOrderBeforePaymentConfirmation,
} from '../utils/orderCapacity.js';
import orderCapacityQueueService from './OrderCapacityQueueService.js';

type FinalizeOrderPixPaymentPayload = {
  orderId?: number | string | null;
  paymentId: string;
  restaurantId?: number | null;
  allowMissingOrder?: boolean;
  providerTimeoutMs?: number;
};

class FinalizeOrderPixPaymentService {
  async syncDeliveryPayment(order: { id: number; restaurantId: number; payOnDelivery?: boolean }) {
    if (order.payOnDelivery !== true) return;
    await paymentTerminalRepository.markDeliveryPaymentPaid({
      orderId: order.id,
      restaurantId: order.restaurantId,
      lastProviderStatus: 'paid',
    });
  }

  async execute({
    orderId,
    paymentId,
    restaurantId,
    allowMissingOrder = false,
    providerTimeoutMs,
  }: FinalizeOrderPixPaymentPayload) {
    const normalizedPaymentId = String(paymentId || '').trim();

    if (!normalizedPaymentId) {
      throw new Error('Pagamento PIX invalido.');
    }

    if (normalizedPaymentId.startsWith('manual:')) {
      throw new Error('Pagamento PIX manual nao e permitido.');
    }

    const normalizedRestaurantId = Number(restaurantId || 0) || undefined;
    const existingPaymentOrder = await orderRepository.findByPixPaymentId(normalizedPaymentId);
    if (existingPaymentOrder && orderId && existingPaymentOrder.id !== Number(orderId)) {
      throw new Error('Este pagamento PIX já foi utilizado em outro pedido.');
    }

    const order = orderId
      ? await orderRepository.findById(orderId, Number(normalizedRestaurantId || 0))
      : existingPaymentOrder;

    if (!order) {
      if (allowMissingOrder) return null;
      throw new Error('Pedido PIX nao encontrado para este pagamento.');
    }

    if (normalizedRestaurantId && order.restaurantId !== normalizedRestaurantId) {
      throw new Error('Este pagamento PIX não pertence ao restaurante do pedido.');
    }

    await orderPixPaymentService.ensurePaymentApproved({
      paymentId: normalizedPaymentId,
      restaurantId: order.restaurantId,
      expectedOrderId: order.id,
      expectedAmount: Number(order.total),
      expectedCurrency: 'BRL',
      timeoutMs: providerTimeoutMs,
    });

    const storedPaymentId = String(order.pixPaymentId || '').trim();
    if (storedPaymentId !== normalizedPaymentId) {
      if (storedPaymentId && String(order.status) !== 'CANCELADO') {
        throw new Error('Pagamento PIX nao corresponde ao pedido informado.');
      }
    }

    if (String(order.status) === 'CANCELADO' && order.paid !== true) {
      await reconcileLateCancelledPaymentService.execute({
        orderId: order.id,
        restaurantId: order.restaurantId,
        paymentMethod: 'PIX',
        paymentReference: normalizedPaymentId,
      });
      return orderRepository.findById(order.id, order.restaurantId);
    }

    if (
      order.type === 'RETIRADA' &&
      (order.paymentMethod === null || order.paymentMethod === 'PIX')
    ) {
      const pickupOrder = await pickupPaymentService.confirmApprovedPix(
        order.id,
        order.restaurantId,
        normalizedPaymentId,
      );
      if (pickupOrder) return pickupOrder;
    }

    if (order.paid === true) {
      await this.syncDeliveryPayment(order);
      // Repara pagamentos antigos cujo processo caiu antes de liberar a mesa.
      await reconcileTableOrderingAfterCommit(order, 'PAYMENT_SETTLED');
      return order;
    }

    let updatedOrder;
    let paymentChanged = false;
    try {
      updatedOrder = await prisma.$transaction(async (tx) => {
        await setTenantDbContext(tx, order.restaurantId);
        const locked = await tx.$queryRaw<Array<{ paid: boolean }>>`
          SELECT "paid" FROM "Order" WHERE "id" = ${order.id}
            AND "restaurantId" = ${order.restaurantId} FOR UPDATE
        `;
        if (locked[0]?.paid === true)
          return orderRepository.findById(order.id, order.restaurantId, tx);
        await orderRepository.claimPixPaymentId(
          order.id,
          order.restaurantId,
          normalizedPaymentId,
          tx,
        );
        await queueDigitalOrderBeforePaymentConfirmation(
          tx,
          order.id,
          order.restaurantId,
        );
        const confirmedOrder = await orderRepository.confirmPayment(
          order.id,
          order.restaurantId,
          tx,
        );
        await markCouponRedemptionUsedForOrder(order.id, order.restaurantId, tx);
        await notifyCustomerPaymentConfirmed({
          restaurantId: confirmedOrder.restaurantId,
          customerPhone: confirmedOrder.user?.phone,
          customerName: confirmedOrder.user?.name,
          restaurantName: confirmedOrder.restaurant?.name,
          restaurantWhatsapp: confirmedOrder.restaurant?.whatsapp,
          orderId: confirmedOrder.id,
          total: confirmedOrder.total,
          paymentMethod: confirmedOrder.paymentMethod,
        }, tx);
        // A liberação da mesa é atômica com a confirmação do pagamento.
        await releaseTableOrderingInTransaction(tx, confirmedOrder);
        paymentChanged = true;
        return confirmedOrder;
      });
    } catch (error) {
      const latest = await orderRepository.findById(order.id, order.restaurantId);
      if (latest?.status === 'CANCELADO' && latest.paid !== true) {
        await reconcileLateCancelledPaymentService.execute({
          orderId: latest.id,
          restaurantId: latest.restaurantId,
          paymentMethod: 'PIX',
          paymentReference: normalizedPaymentId,
        });
        return orderRepository.findById(latest.id, latest.restaurantId);
      }
      throw error;
    }

    await this.syncDeliveryPayment(updatedOrder);

    if (paymentChanged) {
      await publishTableOrderingRelease(updatedOrder, 'PAYMENT_SETTLED');
    } else {
      await reconcileTableOrderingAfterCommit(updatedOrder, 'PAYMENT_SETTLED');
    }

    if (!paymentChanged) return updatedOrder;

    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
    });
    emitTableSessionOrderEvent(io, 'order:payment-confirmed', updatedOrder);

    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
        status: updatedOrder.status,
      });
    }

    const queuedForCapacity = isOrderCapacityQueued(updatedOrder);
    if (!queuedForCapacity)
      io.to(`restaurant:${updatedOrder.restaurantId}`).emit('new-order', updatedOrder);
    else
      io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:capacity-queued', updatedOrder);
    io.to(`restaurant:${updatedOrder.restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }
    if (!queuedForCapacity) {
      emitWaiterTableOrderEvent(io, 'new-order', updatedOrder);
      emitTableSessionOrderEvent(io, 'new-order', updatedOrder);
    }
    emitTableSessionOrderEvent(io, 'order:status-changed', updatedOrder);


    if (queuedForCapacity) {
      const admitted = await orderCapacityQueueService.drainAfterCapacityChange(updatedOrder.restaurantId);
      return admitted.find((candidate) => candidate.id === updatedOrder.id) || updatedOrder;
    }
    return updatedOrder;
  }
}

export default new FinalizeOrderPixPaymentService();
