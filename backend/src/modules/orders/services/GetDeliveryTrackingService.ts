import { UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import getOsrmDeliveryRouteService from './GetOsrmDeliveryRouteService.js';
import courierAccessService from './CourierAccessService.js';
import { generateDeliveryConfirmationCode } from '../utils/deliveryConfirmationCode.js';

class GetDeliveryTrackingService {
  async execute({
    orderId,
    userId,
    restaurantId,
    role,
  }: {
    orderId: number | string;
    userId: number;
    restaurantId: number | null;
    role: string;
  }) {
    const id = Number(orderId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Pedido inválido.');
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        userId: true,
        restaurantId: true,
        assignedCourierId: true,
        status: true,
        type: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        deliveryStartedAt: true,
        deliveredAt: true,
        assignedCourier: { select: { id: true, name: true, phone: true, avatar: true } },
      },
    });
    if (!order) throw new Error('Pedido não encontrado.');
    if (String(order.type || '').toUpperCase() !== 'DELIVERY') {
      throw new Error('Rastreamento disponível apenas para pedidos de delivery.');
    }
    const normalizedRole = String(role || '').toUpperCase();
    const isCustomer = order.userId === userId;
    const allowed =
      isCustomer ||
      (normalizedRole === UserRole.MOTOQUEIRO && order.assignedCourierId === userId) ||
      (normalizedRole === UserRole.ADMIN && order.restaurantId === restaurantId);
    if (!allowed) throw new Error('Você não pode acompanhar esta entrega.');
    if (normalizedRole === UserRole.MOTOQUEIRO) {
      await courierAccessService.assertActiveCourier(userId, Number(restaurantId || 0));
    }
    if (normalizedRole === UserRole.ADMIN) {
      const activeAdmin = await prisma.user.findFirst({
        where: {
          id: userId,
          restaurantId: Number(restaurantId || 0),
          role: UserRole.ADMIN,
          active: true,
        },
        select: { id: true },
      });
      if (!activeAdmin) {
        throw new Error('Sua conta de administrador não está ativa neste restaurante.');
      }
    }

    const locations = await prisma.deliveryLocation.findMany({
      where: { orderId: id },
      orderBy: { recordedAt: 'desc' },
      take: 1000,
      select: {
        latitude: true,
        longitude: true,
        heading: true,
        speed: true,
        accuracy: true,
        recordedAt: true,
      },
    });
    locations.reverse();
    const latestLocation = locations.length ? locations[locations.length - 1] : null;
    const routeEstimate =
      order.status === 'SAIU_PARA_ENTREGA' && latestLocation
        ? await getOsrmDeliveryRouteService.execute({
            latitude: Number(latestLocation.latitude),
            longitude: Number(latestLocation.longitude),
            destination: order,
          })
        : null;
    const estimatedArrival = routeEstimate
      ? new Date(Date.now() + routeEstimate.durationSeconds * 1000).toISOString()
      : null;
    const deliveryConfirmationCode =
      isCustomer && order.status === 'SAIU_PARA_ENTREGA' && order.deliveryStartedAt
        ? generateDeliveryConfirmationCode({
            orderId: order.id,
            publicId: order.publicId,
            deliveryStartedAt: order.deliveryStartedAt,
          })
        : null;

    return {
      order: {
        ...order,
        estimatedArrival,
        routeEstimate,
        deliveryConfirmationCode,
      },
      locations: locations.map((point) => ({
        ...point,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
      })),
      latestLocation: latestLocation
        ? {
            ...latestLocation,
            latitude: Number(latestLocation.latitude),
            longitude: Number(latestLocation.longitude),
          }
        : null,
    };
  }
}

export default new GetDeliveryTrackingService();
