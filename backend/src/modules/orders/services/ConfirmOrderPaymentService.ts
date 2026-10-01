import { PaymentMethod, UserRole } from '@prisma/client';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import {
  isOrderCapacityQueued,
  queueDigitalOrderBeforePaymentConfirmation,
} from '../utils/orderCapacity.js';
import orderCapacityQueueService from './OrderCapacityQueueService.js';

export function resolveManualPaymentConfirmationKind(order: {
  payOnDelivery: boolean;
  paymentMethod?: PaymentMethod | null;
  payOnDeliveryMethod?: PaymentMethod | null;
}) {
  const paymentMethod = order.payOnDeliveryMethod || order.paymentMethod || null;
  if (order.payOnDelivery === true && paymentMethod === PaymentMethod.DINHEIRO) {
    return 'DELIVERY_CASH' as const;
  }
  if (
    order.payOnDelivery !== true &&
    (paymentMethod === PaymentMethod.PIX || paymentMethod === PaymentMethod.CARTAO)
  ) {
    return 'PENDING_DIGITAL' as const;
  }
  return null;
}

class ConfirmOrderPaymentService {
  async execute(
    orderId: number | string | string[],
    restaurantId: number,
    role: string,
    actorUserId?: number | string | null,
  ) {
    const normalizedOrderId = Array.isArray(orderId) ? orderId[0] : orderId;
    const normalizedActorUserId = Number(actorUserId || 0);

    if (String(role || '').toUpperCase() !== UserRole.ADMIN) {
      throw new Error('Somente o administrador pode confirmar pagamento diretamente.');
    }

    const order = await orderRepository.findById(normalizedOrderId, restaurantId);

    if (!order) {
      throw new Error('Pedido não encontrado!');
    }

    if (order.paid === true) {
      return order;
    }

    const paymentMethod = order.payOnDeliveryMethod || order.paymentMethod;
    const confirmationKind = resolveManualPaymentConfirmationKind(order);
    const isDeliveryCash = confirmationKind === 'DELIVERY_CASH';
    const isPendingDigitalPayment = confirmationKind === 'PENDING_DIGITAL';

    if (!confirmationKind) {
      throw new Error(
        'Este pagamento deve ser concluído pelo fluxo específico de cobrança do pedido.',
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (isPendingDigitalPayment)
        await queueDigitalOrderBeforePaymentConfirmation(
          tx,
          Number(normalizedOrderId),
          restaurantId,
        );
      const confirmedOrder = await orderRepository.confirmPayment(
        normalizedOrderId,
        restaurantId,
        tx,
      );
      await markCouponRedemptionUsedForOrder(normalizedOrderId, restaurantId, tx);

      const actor = normalizedActorUserId
        ? await tx.user.findFirst({
            where: {
              id: normalizedActorUserId,
              restaurantId,
              role: UserRole.ADMIN,
              active: true,
            },
            select: { id: true, name: true },
          })
        : null;
      if (!actor) {
        throw new Error('Administrador não autorizado para este restaurante.');
      }

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          userName: actor.name,
          userRole: UserRole.ADMIN,
          restaurantId,
          restaurantName: confirmedOrder.restaurant?.name || order.restaurant?.name || null,
          action: isDeliveryCash
            ? 'ADMIN_CASH_PAYMENT_CONFIRMED'
            : 'ADMIN_PAYMENT_MANUAL_OVERRIDE',
          resource: `Order:${Number(normalizedOrderId)}`,
          result: 'SUCCESS',
          metadata: isDeliveryCash
            ? {
                paymentMethod: PaymentMethod.DINHEIRO,
                previousPaid: false,
                payOnDelivery: true,
                reason: 'Recebimento em dinheiro confirmado manualmente pelo administrador.',
              }
            : {
                paymentMethod,
                previousPaid: false,
                pixPaymentId: order.pixPaymentId || null,
                cardCheckoutSessionId: order.cardCheckoutSessionId || null,
                reason:
                  'Pagamento conferido externamente pelo administrador após falha ou ausência de confirmação automática.',
              },
        },
      });

      return confirmedOrder;
    });

    io.to(`restaurant:${restaurantId}`).emit('order:payment-confirmed', {
      orderId: updatedOrder.id,
      paid: true,
      paymentMethod: updatedOrder.paymentMethod,
    });

    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:payment-confirmed', {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });

      io.to(`user:${updatedOrder.userId}`).emit('payment-confirmed', {
        orderId: updatedOrder.id,
        paid: true,
        paymentMethod: updatedOrder.paymentMethod,
      });
    }

    // Dinheiro na entrega já entra no fluxo operacional quando o pedido é criado.
    // Somente pagamentos digitais pendentes precisam entrar na operação após a confirmação.
    if (isPendingDigitalPayment) {
      const queuedForCapacity = isOrderCapacityQueued(updatedOrder);
      if (!queuedForCapacity) {
        io.to(`restaurant:${restaurantId}`).emit('new-order', updatedOrder);
        if (updatedOrder.userId) {
          io.to(`user:${updatedOrder.userId}`).emit('new-order', updatedOrder);
        }
      } else {
        io.to(`restaurant:${restaurantId}`).emit('order:capacity-queued', updatedOrder);
      }

      if (queuedForCapacity) {
        const admitted = await orderCapacityQueueService.drainAfterCapacityChange(restaurantId);
        return admitted.find((candidate) => candidate.id === updatedOrder.id) || updatedOrder;
      }
    }

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }

    return updatedOrder;
  }
}

export default new ConfirmOrderPaymentService();
