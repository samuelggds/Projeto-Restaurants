import { PaymentMethod, UserRole } from '@prisma/client';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { markCouponRedemptionUsedForOrder } from './couponRedemptionLifecycle.js';
import {
  isOrderCapacityQueued,
  queueDigitalOrderBeforePaymentConfirmation,
} from '../utils/orderCapacity.js';

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

    const paymentMethod = order.paymentMethod;
    const isDeliveryCash =
      order.payOnDelivery === true && paymentMethod === PaymentMethod.DINHEIRO;
    const isPendingDigitalPayment =
      order.payOnDelivery !== true &&
      (paymentMethod === PaymentMethod.PIX || paymentMethod === PaymentMethod.CARTAO);

    if (!isDeliveryCash && !isPendingDigitalPayment) {
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

      if (isPendingDigitalPayment) {
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
            action: 'ADMIN_PAYMENT_MANUAL_OVERRIDE',
            resource: `Order:${Number(normalizedOrderId)}`,
            result: 'SUCCESS',
            metadata: {
              paymentMethod,
              previousPaid: false,
              pixPaymentId: order.pixPaymentId || null,
              cardCheckoutSessionId: order.cardCheckoutSessionId || null,
              reason: 'Pagamento conferido externamente pelo administrador após falha ou ausência de confirmação automática.',
            },
          },
        });
      }

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

    // Depois da confirmação, o pedido pode entrar no fluxo operacional que estava
    // bloqueado enquanto o pagamento digital permanecia pendente.
    const queuedForCapacity = isOrderCapacityQueued(updatedOrder);
    if (!queuedForCapacity) {
      io.to(`restaurant:${restaurantId}`).emit('new-order', updatedOrder);
      if (updatedOrder.userId) {
        io.to(`user:${updatedOrder.userId}`).emit('new-order', updatedOrder);
      }
    } else {
      io.to(`restaurant:${restaurantId}`).emit('order:capacity-queued', updatedOrder);
    }

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    if (updatedOrder.userId) {
      io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);
    }

    return updatedOrder;
  }
}

export default new ConfirmOrderPaymentService();
