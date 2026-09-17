import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { notifyCustomerOrderStatusChanged } from '../../../services/customerNotifier.js';
import { validateDeliveryLocationPayload } from '../../../socket/deliveryLocationPayload.js';
import orderRepository from '../repositories/OrderRepository.js';
import courierAccessService from './CourierAccessService.js';

type StartRouteInput = {
  orderId: number | string;
  restaurantId: number;
  courierId: number;
  role: string;
  initialLocation: Record<string, unknown> | null;
};

class StartCourierRouteService {
  async execute({ orderId, restaurantId, courierId, role, initialLocation }: StartRouteInput) {
    const normalizedOrderId = Number(orderId);
    if (String(role || '').toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error('Somente motoqueiros podem iniciar uma rota de entrega.');
    }
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }

    const hasInitialLocation =
      Boolean(initialLocation) && typeof initialLocation === 'object' && !Array.isArray(initialLocation);
    const initialLocationValidation = hasInitialLocation
      ? validateDeliveryLocationPayload({ ...initialLocation, orderId: normalizedOrderId })
      : null;
    if (initialLocationValidation && 'error' in initialLocationValidation) {
      throw new Error(initialLocationValidation.error);
    }

    const startedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      await courierAccessService.assertActiveCourier(courierId, restaurantId, tx);

      // Todas as tentativas de iniciar rota do mesmo motoqueiro passam pela
      // mesma linha de User. Isso serializa cliques concorrentes sem limitar
      // outros motoqueiros do restaurante.
      const courierLock = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id"
        FROM "User"
        WHERE "id" = ${courierId}
          AND "restaurantId" = ${restaurantId}
          AND "role" = CAST(${UserRole.MOTOQUEIRO} AS "UserRole")
          AND "active" = TRUE
        FOR UPDATE
      `;
      if (courierLock.length !== 1) {
        throw new Error('Motoqueiro inativo ou não vinculado a este restaurante.');
      }

      const activeRoute = await tx.order.findFirst({
        where: {
          restaurantId,
          assignedCourierId: courierId,
          type: OrderType.DELIVERY,
          status: OrderStatus.SAIU_PARA_ENTREGA,
        },
        select: { id: true },
        orderBy: [{ deliveryStartedAt: 'desc' }, { id: 'desc' }],
      });

      if (activeRoute && activeRoute.id !== normalizedOrderId) {
        throw new Error(
          `Finalize a entrega #${activeRoute.id} antes de iniciar outra rota.`,
        );
      }

      if (activeRoute?.id === normalizedOrderId) {
        const alreadyStarted = await orderRepository.findById(normalizedOrderId, restaurantId, tx);
        if (!alreadyStarted) throw new Error('Não foi possível carregar a entrega em andamento.');
        return { order: alreadyStarted, location: null, savedLocation: null, changed: false };
      }

      const target = await tx.order.findFirst({
        where: {
          id: normalizedOrderId,
          restaurantId,
          assignedCourierId: courierId,
          type: OrderType.DELIVERY,
          status: OrderStatus.PRONTO,
        },
        select: {
          id: true,
          paid: true,
          paymentMethod: true,
          payOnDelivery: true,
        },
      });
      if (!target) {
        const current = await tx.order.findFirst({
          where: { id: normalizedOrderId, restaurantId },
          select: { type: true, status: true, assignedCourierId: true },
        });
        if (!current) throw new Error('Pedido não encontrado.');
        if (current.type !== OrderType.DELIVERY) throw new Error('Este pedido não é uma entrega.');
        if (Number(current.assignedCourierId || 0) !== courierId) {
          throw new Error('Este pedido não está atribuído a você.');
        }
        throw new Error('Este pedido não está pronto para iniciar rota.');
      }

      const isPendingOnlinePayment =
        target.paid !== true &&
        target.payOnDelivery !== true &&
        (String(target.paymentMethod || '').toUpperCase() === 'PIX' ||
          String(target.paymentMethod || '').toUpperCase() === 'CARTAO');
      if (isPendingOnlinePayment) {
        throw new Error('O pagamento digital precisa estar confirmado antes de iniciar a rota.');
      }

      const started = await tx.order.updateMany({
        where: {
          id: normalizedOrderId,
          restaurantId,
          assignedCourierId: courierId,
          type: OrderType.DELIVERY,
          status: OrderStatus.PRONTO,
        },
        data: {
          status: OrderStatus.SAIU_PARA_ENTREGA,
          deliveryStartedAt: startedAt,
        },
      });
      if (started.count !== 1) {
        throw new Error('O pedido mudou enquanto a rota era iniciada. Atualize a tela.');
      }

      let savedLocation: { recordedAt: Date } | null = null;
      let location = null;
      if (initialLocationValidation && !('error' in initialLocationValidation)) {
        location = initialLocationValidation.value;
        savedLocation = await tx.deliveryLocation.create({
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
      }

      const startedOrder = await orderRepository.findById(normalizedOrderId, restaurantId, tx);
      if (!startedOrder) throw new Error('Não foi possível carregar a entrega iniciada.');
      return { order: startedOrder, location, savedLocation, changed: true };
    });

    if (!result.changed) return result.order;

    const { order, location, savedLocation } = result;
    void notifyCustomerOrderStatusChanged({
      restaurantId,
      customerPhone: order.user?.phone,
      customerName: order.user?.name,
      restaurantName: order.restaurant?.name,
      restaurantWhatsapp: order.restaurant?.whatsapp,
      orderId: order.id,
      publicId: order.publicId,
      orderType: order.type,
      status: order.status,
      deliveryStartedAt: order.deliveryStartedAt,
    }).catch((error: unknown) => {
      console.error(
        '[CUSTOMER_STATUS_NOTIFICATION_UNHANDLED]',
        error instanceof Error ? error.message : String(error),
      );
    });

    io.to(`restaurant:${restaurantId}`).emit('order:status-changed', order);
    if (order.userId) io.to(`user:${order.userId}`).emit('order:status-changed', order);

    if (location && savedLocation) {
      const payload = {
        orderId: order.id,
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
      if (order.userId) io.to(`user:${order.userId}`).emit('order:delivery-location', payload);
      io.to(`restaurant:${restaurantId}:admin`).emit('order:delivery-location', payload);
    }

    return order;
  }
}

export default new StartCourierRouteService();
