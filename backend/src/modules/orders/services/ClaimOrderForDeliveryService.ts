import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';
import { validateDeliveryLocationPayload } from '../../../socket/deliveryLocationPayload.js';
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
    initialLocation,
  }: {
    orderId: number | string;
    restaurantId: number;
    courierId: number;
    role: string;
    initialLocation: Record<string, unknown> | null;
  }) {
    const normalizedOrderId = Number(orderId);
    if (String(role || '').toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error('Somente motoqueiros podem retirar pedidos para entrega.');
    }
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }

    const hasInitialLocation =
      Boolean(initialLocation) && typeof initialLocation === 'object' && !Array.isArray(initialLocation);
    const initialLocationValidation = hasInitialLocation
      ? validateDeliveryLocationPayload({
          ...initialLocation,
          orderId: normalizedOrderId,
        })
      : null;
    if (initialLocationValidation && 'error' in initialLocationValidation) {
      throw new Error(initialLocationValidation.error);
    }

    const result = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await courierAccessService.assertActiveCourier(courierId, restaurantId, tx);

      const orderForCompensation = await tx.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId,
          type: OrderType.DELIVERY,
          status: OrderStatus.PRONTO,
          assignedCourierId: null,
        },
        select: { deliveryDistanceMeters: true },
      });
      if (!orderForCompensation) throw new Error('O pedido não está disponível para retirada.');
      const compensationPolicy = await findEffectiveCompensationPolicy(tx, restaurantId, courierId);
      const courierEarning = calculateCourierCompensation(
        compensationPolicy,
        orderForCompensation.deliveryDistanceMeters,
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
          deliveryStartedAt: new Date(),
          courierEarning,
          courierEarningCalculatedAt: compensationCalculatedAt,
          courierCompensationModel: compensationPolicy.model,
          status: OrderStatus.SAIU_PARA_ENTREGA,
        },
      });

      if (claimed.count !== 1) {
        const current = await tx.order.findFirst({
          where: { id: normalizedOrderId, restaurantId },
          select: { type: true, status: true, assignedCourierId: true },
        });
        if (!current) throw new Error('Pedido não encontrado.');
        if (current.type !== OrderType.DELIVERY) throw new Error('Este pedido não é uma entrega.');
        if (current.assignedCourierId)
          throw new Error('Este pedido já foi retirado por outro motoqueiro.');
        throw new Error('O pedido não está disponível para retirada.');
      }

      const updatedOrder = await orderRepository.findById(normalizedOrderId, restaurantId, tx);
      if (!updatedOrder) throw new Error('Não foi possível carregar o pedido.');

      if (!initialLocationValidation || 'error' in initialLocationValidation) {
        return { updatedOrder, location: null, savedLocation: null };
      }

      const location = initialLocationValidation.value;
      const savedLocation = await tx.deliveryLocation.create({
        data: {
          orderId: normalizedOrderId,
          courierId,
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          speed: location.speed,
          accuracy: location.accuracy,
          recordedAt: location.recordedAt,
        },
        select: { recordedAt: true },
      });

      return { updatedOrder, location, savedLocation };
    });

    const { updatedOrder, location, savedLocation } = result;
    const payOnDeliveryMethod = String(
      updatedOrder.payOnDeliveryMethod || updatedOrder.paymentMethod || '',
    ).toUpperCase();
    const requiresAutomatedDeliveryPayment =
      updatedOrder.payOnDelivery === true &&
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
      ? (await orderRepository.findById(normalizedOrderId, restaurantId)) || updatedOrder
      : updatedOrder;

    notifyCustomerOrderStatusChanged({
      restaurantId,
      customerPhone: refreshedOrder.user?.phone,
      customerName: refreshedOrder.user?.name,
      restaurantName: refreshedOrder.restaurant?.name,
      restaurantWhatsapp: refreshedOrder.restaurant?.whatsapp,
      orderId: refreshedOrder.id,
      status: refreshedOrder.status,
    }).catch((error: unknown) => {
      console.error(
        '[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', refreshedOrder);
    if (refreshedOrder.userId) {
      io.to(`user:${refreshedOrder.userId}`).emit('order:status-changed', refreshedOrder);
    }

    if (location && savedLocation) {
      const payload = {
        orderId: refreshedOrder.id,
        restaurantId,
        latitude: location.latitude,
        longitude: location.longitude,
        heading: location.heading,
        speed: location.speed,
        accuracy: location.accuracy,
        sentAt: location.sentAt,
        recordedAt: savedLocation.recordedAt.toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (refreshedOrder.userId) {
        io.to(`user:${refreshedOrder.userId}`).emit('order:delivery-location', payload);
      }
      io.to(`restaurant:${restaurantId}:admin`).emit('order:delivery-location', payload);
    }

    return refreshedOrder;
  }
}

export default new ClaimOrderForDeliveryService();
