import { randomUUID } from 'node:crypto';
import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { buildDeliveryDestination } from '../utils/deliveryRouteEstimate.js';
import deliveryNavigationSessionRepository from '../repositories/DeliveryNavigationSessionRepository.js';
import navigationConnectService from './NavigationConnectService.js';
import courierAccessService from './CourierAccessService.js';

type PrepareNavigationInput = {
  orderId: number | string;
  restaurantId: number;
  courierId: number;
  role: string;
};

const TOKEN_REUSE_SAFETY_WINDOW_MS = 2 * 60 * 1000;

function buildWazeUrl(destination: string, token: string) {
  const url = new URL('https://waze.com/ul');
  url.searchParams.set('q', destination);
  url.searchParams.set('navigate', 'yes');
  url.searchParams.set('external_trip_token', token);
  return url.toString();
}

function buildGoogleMapsUrl(destination: string, token: string) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', destination);
  url.searchParams.set('dir_action', 'navigate');
  url.searchParams.set('action_token', token);
  return url.toString();
}

class PrepareCourierNavigationService {
  async execute({ orderId, restaurantId, courierId, role }: PrepareNavigationInput) {
    const normalizedOrderId = Number(orderId);
    if (String(role || '').toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error('Somente motoqueiros podem abrir a navegação de uma entrega.');
    }
    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      throw new Error('Pedido inválido.');
    }
    if (!navigationConnectService.isEnabled()) {
      throw new Error('Navigation Connect ainda não está habilitado neste ambiente.');
    }

    await courierAccessService.assertActiveCourier(courierId, restaurantId);

    const order = await prisma.order.findFirst({
      where: {
        id: normalizedOrderId,
        restaurantId,
        assignedCourierId: courierId,
        type: OrderType.DELIVERY,
        status: OrderStatus.SAIU_PARA_ENTREGA,
      },
      select: {
        id: true,
        restaurantId: true,
        assignedCourierId: true,
        address: true,
        number: true,
        district: true,
        city: true,
        state: true,
      },
    });
    if (!order) {
      throw new Error('A navegação só pode ser aberta para a sua entrega ativa.');
    }

    const destination = buildDeliveryDestination(order);
    if (!destination) {
      throw new Error('O pedido não possui um endereço de entrega válido para abrir o Waze.');
    }

    let session = await deliveryNavigationSessionRepository.findByOrder(
      normalizedOrderId,
      restaurantId,
    );
    const canReuse =
      session &&
      session.courierId === courierId &&
      session.authTokenExpiresAt.getTime() > Date.now() + TOKEN_REUSE_SAFETY_WINDOW_MS;

    if (!canReuse) {
      const tripId = randomUUID();
      const created = await navigationConnectService.createTrip(tripId);
      const expiresAt = new Date(created.expireTime);
      if (!Number.isFinite(expiresAt.getTime())) {
        throw new Error('O Navigation Connect retornou uma validade de token inválida.');
      }

      session = await deliveryNavigationSessionRepository.upsert({
        orderId: normalizedOrderId,
        restaurantId,
        courierId,
        tripId,
        authToken: created.token,
        authTokenExpiresAt: expiresAt,
      });
    }

    if (!session) throw new Error('Não foi possível preparar a navegação desta entrega.');

    const androidAppId = String(process.env.NAVIGATION_CONNECT_ANDROID_APP_ID || '').trim();
    return {
      orderId: normalizedOrderId,
      tripId: session.tripId,
      authToken: session.authToken,
      authTokenExpiresAt: session.authTokenExpiresAt.toISOString(),
      destination,
      androidAppId,
      wazeUrl: buildWazeUrl(destination, session.authToken),
      googleMapsUrl: buildGoogleMapsUrl(destination, session.authToken),
      android: {
        referrerName: `android-app://${androidAppId}`,
        requiresNativeIntent: true,
      },
    };
  }
}

export default new PrepareCourierNavigationService();
