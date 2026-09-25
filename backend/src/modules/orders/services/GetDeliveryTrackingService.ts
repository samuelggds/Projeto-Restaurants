import { UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import getOsrmDeliveryRouteService from './GetOsrmDeliveryRouteService.js';
import geoapifyDeliveryRoutingProvider from './GeoapifyDeliveryRoutingProvider.js';
import googleRoutesDeliveryRoutingProvider from './GoogleRoutesDeliveryRoutingProvider.js';
import { getConfiguredDeliveryRoutingProviderId } from './GetDeliveryRoutingProvider.js';
import courierAccessService from './CourierAccessService.js';
import { generateDeliveryConfirmationCode } from '../utils/deliveryConfirmationCode.js';
import deliveryNavigationSessionRepository from '../repositories/DeliveryNavigationSessionRepository.js';
import navigationConnectService, {
  extractNavigationConnectTelemetry,
} from './NavigationConnectService.js';

class GetDeliveryTrackingService {
  async execute({
    orderId,
    userId,
    restaurantId,
    role,
    guestPublicId,
  }: {
    orderId: number | string;
    userId: number | null;
    restaurantId: number | null;
    role: string;
    guestPublicId?: string | null;
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
        paid: true,
        paymentMethod: true,
        pixPaymentId: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
        deliveryStartedAt: true,
        deliveredAt: true,
        deliveryConfirmedAt: true,
        assignedCourier: { select: { id: true, name: true, phone: true, avatar: true } },
      },
    });
    if (!order) throw new Error('Pedido não encontrado.');
    if (String(order.type || '').toUpperCase() !== 'DELIVERY') {
      throw new Error('Rastreamento disponível apenas para pedidos de delivery.');
    }

    const normalizedRole = String(role || '').toUpperCase();
    const authenticatedUserId = Number(userId || 0);
    const isAuthenticatedCustomer =
      authenticatedUserId > 0 && order.userId === authenticatedUserId;
    const isGuestCustomer =
      Boolean(guestPublicId) && String(order.publicId) === String(guestPublicId);
    const isCustomer = isAuthenticatedCustomer || isGuestCustomer;
    const isCourier =
      authenticatedUserId > 0 &&
      normalizedRole === UserRole.MOTOQUEIRO &&
      order.assignedCourierId === authenticatedUserId;
    const isAdmin =
      authenticatedUserId > 0 &&
      normalizedRole === UserRole.ADMIN &&
      order.restaurantId === restaurantId;

    if (!isCustomer && !isCourier && !isAdmin) {
      throw new Error('Você não pode acompanhar esta entrega.');
    }

    if (isCourier) {
      await courierAccessService.assertActiveCourier(
        authenticatedUserId,
        Number(restaurantId || 0),
      );
    }

    if (isAdmin) {
      const activeAdmin = await prisma.user.findFirst({
        where: {
          id: authenticatedUserId,
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

    let navigationTelemetry = null;
    if (order.status === 'SAIU_PARA_ENTREGA' && navigationConnectService.isEnabled()) {
      try {
        const tripId = await deliveryNavigationSessionRepository.findTripIdByOrder(
          id,
          order.restaurantId,
        );
        if (tripId) {
          navigationTelemetry = extractNavigationConnectTelemetry(
            await navigationConnectService.getTrip(tripId),
          );
        }
      } catch (error) {
        console.warn(
          '[NAVIGATION_CONNECT_TRACKING_FALLBACK]',
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    const databaseLatestLocation = locations.length ? locations[locations.length - 1] : null;
    const navigationLocation = navigationTelemetry?.location
      ? {
          latitude: navigationTelemetry.location.latitude,
          longitude: navigationTelemetry.location.longitude,
          heading: null,
          speed: null,
          accuracy: null,
          recordedAt: new Date(navigationTelemetry.location.recordedAt),
        }
      : null;
    const latestLocation = navigationLocation || databaseLatestLocation;

    const configuredRoutingProvider = getConfiguredDeliveryRoutingProviderId();
    let configuredRouteEstimate = null;
    if (order.status === 'SAIU_PARA_ENTREGA' && latestLocation) {
      const routeInput = {
        latitude: Number(latestLocation.latitude),
        longitude: Number(latestLocation.longitude),
        destination: order,
      };

      if (configuredRoutingProvider === 'google') {
        configuredRouteEstimate =
          (await googleRoutesDeliveryRoutingProvider.calculateRouteEstimate(routeInput)) ||
          (await geoapifyDeliveryRoutingProvider.calculateRouteEstimate(routeInput)) ||
          (await getOsrmDeliveryRouteService.execute(routeInput));
      } else if (configuredRoutingProvider === 'geoapify') {
        configuredRouteEstimate =
          (await geoapifyDeliveryRoutingProvider.calculateRouteEstimate(routeInput)) ||
          (await getOsrmDeliveryRouteService.execute(routeInput));
      } else {
        configuredRouteEstimate = await getOsrmDeliveryRouteService.execute(routeInput);
      }
    }

    const hasNavigationEstimate =
      navigationTelemetry &&
      (navigationTelemetry.remainingDurationSeconds !== null ||
        navigationTelemetry.remainingDistanceMeters !== null);
    const routeEstimate = hasNavigationEstimate
      ? {
          ...(configuredRouteEstimate || {
            durationSeconds: navigationTelemetry?.remainingDurationSeconds || 0,
            distanceMeters: navigationTelemetry?.remainingDistanceMeters ?? null,
          }),
          durationSeconds:
            navigationTelemetry?.remainingDurationSeconds ?? configuredRouteEstimate?.durationSeconds ?? 0,
          distanceMeters:
            navigationTelemetry?.remainingDistanceMeters ?? configuredRouteEstimate?.distanceMeters ?? null,
          provider: 'NAVIGATION_CONNECT' as const,
        }
      : configuredRouteEstimate;

    const estimatedArrival =
      routeEstimate && routeEstimate.durationSeconds > 0
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

    const normalizedLocations = locations.map((point) => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }));
    if (navigationLocation) {
      const latestStoredAt = databaseLatestLocation?.recordedAt?.getTime() || 0;
      if (navigationLocation.recordedAt.getTime() >= latestStoredAt) {
        normalizedLocations.push(navigationLocation);
      }
    }

    return {
      order: {
        ...order,
        estimatedArrival,
        routeEstimate,
        navigationState: navigationTelemetry?.state || null,
        deliveryConfirmationCode,
        canConfirmDeliveryReceipt:
          isCustomer && order.status === 'ENTREGUE' && !order.deliveryConfirmedAt,
      },
      locations: normalizedLocations,
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
