import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';
import { validateDeliveryLocationPayload } from '../../../socket/deliveryLocationPayload.js';

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

    if (!initialLocation || typeof initialLocation !== 'object' || Array.isArray(initialLocation)) {
      throw new Error('A localização atual é obrigatória para retirar o pedido.');
    }

    const initialLocationValidation = validateDeliveryLocationPayload({
      ...initialLocation,
      orderId: normalizedOrderId,
    });
    if ('error' in initialLocationValidation) {
      throw new Error(initialLocationValidation.error);
    }

    const result = await prisma.$transaction(async (tx) => {
      await courierAccessService.assertActiveCourier(courierId, restaurantId, tx);

      const settings = await tx.restaurantSettings.findUnique({
        where: { restaurantId },
        select: { courierFeePerDelivery: true },
      });
      const courierEarning = settings?.courierFeePerDelivery || 0;

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

    notifyCustomerOrderStatusChanged({
      restaurantId,
      customerPhone: updatedOrder.user?.phone,
      customerName: updatedOrder.user?.name,
      restaurantName: updatedOrder.restaurant?.name,
      restaurantWhatsapp: updatedOrder.restaurant?.whatsapp,
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    }).catch((error: unknown) => {
      console.error(
        '[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', updatedOrder);
    io.to(`user:${updatedOrder.userId}`).emit('order:status-changed', updatedOrder);

    const payload = {
      orderId: updatedOrder.id,
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
    io.to(`user:${updatedOrder.userId}`).emit('order:delivery-location', payload);
    io.to(`restaurant:${restaurantId}:admin`).emit('order:delivery-location', payload);

    return updatedOrder;
  }
}

export default new ClaimOrderForDeliveryService();
