import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { calculateCourierCompensation } from '../../courierCompensation/domain/courierCompensation.js';
import { findEffectiveCompensationPolicy } from '../../courierCompensation/repositories/CourierCompensationRepository.js';
import paymentTerminalService from '../../paymentTerminals/services/PaymentTerminalService.js';

class ClaimOrderForDeliveryService {
  async execute({
    orderId,
    restaurantId,
    courierId,
    role,
  }: {
    orderId: number | string;
    restaurantId: number;
    courierId: number;
    role: string;
  }) {
    const normalizedOrderId = Number(orderId);
    if (String(role || '').toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error('Somente motoqueiros podem retirar pedidos para entrega.');
    }
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }

    const claimedOrder = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await courierAccessService.assertActiveCourier(courierId, restaurantId, tx);

      const current = await tx.order.findFirst({
        where: { id: normalizedOrderId, restaurantId },
        select: {
          id: true,
          type: true,
          status: true,
          assignedCourierId: true,
          deliveryDistanceMeters: true,
        },
      });
      if (!current) throw new Error('Pedido não encontrado.');
      if (current.type !== OrderType.DELIVERY) throw new Error('Este pedido não é uma entrega.');

      if (
        current.status === OrderStatus.PRONTO &&
        Number(current.assignedCourierId || 0) === courierId
      ) {
        const alreadyClaimed = await orderRepository.findById(normalizedOrderId, restaurantId, tx);
        if (!alreadyClaimed) throw new Error('Não foi possível carregar o pedido atribuído.');
        return alreadyClaimed;
      }

      if (current.assignedCourierId) {
        throw new Error('Este pedido já foi retirado por outro motoqueiro.');
      }
      if (current.status !== OrderStatus.PRONTO) {
        throw new Error('O pedido não está disponível para retirada.');
      }

      const compensationPolicy = await findEffectiveCompensationPolicy(tx, restaurantId, courierId);
      const courierEarning = calculateCourierCompensation(
        compensationPolicy,
        current.deliveryDistanceMeters,
      );
      const compensationCalculatedAt = new Date();

      const claimed = await tx.order.updateMany({
        where: {
          id: normalizedOrderId,
          restaurantId,
          type: OrderType.DELIVERY,
          status: OrderStatus.PRONTO,
          assignedCourierId: null,
          NOT: {
            paid: false,
            paymentMethod: { in: ['PIX', 'CARTAO'] },
            payOnDelivery: false,
          },
        },
        data: {
          assignedCourierId: courierId,
          courierEarning,
          courierEarningCalculatedAt: compensationCalculatedAt,
          courierCompensationModel: compensationPolicy.model,
        },
      });

      if (claimed.count !== 1) {
        const concurrent = await tx.order.findFirst({
          where: { id: normalizedOrderId, restaurantId },
          select: { type: true, status: true, assignedCourierId: true },
        });
        if (!concurrent) throw new Error('Pedido não encontrado.');
        if (concurrent.type !== OrderType.DELIVERY) throw new Error('Este pedido não é uma entrega.');
        if (Number(concurrent.assignedCourierId || 0) === courierId && concurrent.status === OrderStatus.PRONTO) {
          const alreadyClaimed = await orderRepository.findById(normalizedOrderId, restaurantId, tx);
          if (alreadyClaimed) return alreadyClaimed;
        }
        if (concurrent.assignedCourierId) {
          throw new Error('Este pedido já foi retirado por outro motoqueiro.');
        }
        throw new Error('O pedido não está disponível para retirada.');
      }

      const updatedOrder = await orderRepository.findById(normalizedOrderId, restaurantId, tx);
      if (!updatedOrder) throw new Error('Não foi possível carregar o pedido.');
      return updatedOrder;
    });

    const payOnDeliveryMethod = String(
      claimedOrder.payOnDeliveryMethod || claimedOrder.paymentMethod || '',
    ).toUpperCase();
    const requiresAutomatedDeliveryPayment =
      claimedOrder.payOnDelivery === true &&
      (payOnDeliveryMethod === 'PIX' || payOnDeliveryMethod === 'CARTAO');

    if (requiresAutomatedDeliveryPayment) {
      try {
        await paymentTerminalService.ensureForClaim(normalizedOrderId, restaurantId, courierId);
      } catch (error) {
        console.warn(
          '[DELIVERY_PAYMENT_SETUP_DEFERRED]',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const refreshedOrder = requiresAutomatedDeliveryPayment
      ? (await orderRepository.findById(normalizedOrderId, restaurantId)) || claimedOrder
      : claimedOrder;

    // A retirada apenas reserva o pedido para este motoqueiro. O cliente só é
    // notificado como "em entrega" quando a rota for iniciada explicitamente.
    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', refreshedOrder);
    if (refreshedOrder.userId) {
      io.to(`user:${refreshedOrder.userId}`).emit('order:status-changed', refreshedOrder);
    }
    return refreshedOrder;
  }
}

export default new ClaimOrderForDeliveryService();
