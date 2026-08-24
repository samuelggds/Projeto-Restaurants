// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { OrderStatus, OrderType, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import courierAccessService from './CourierAccessService.js';
import getDeliveryTrackingService from './GetDeliveryTrackingService.js';
import getOsrmDeliveryRouteService from './GetOsrmDeliveryRouteService.js';

const originals = {
  findOrder: prisma.order.findUnique,
  findLocations: prisma.deliveryLocation.findMany,
  getRoute: getOsrmDeliveryRouteService.execute,
  assertActiveCourier: courierAccessService.assertActiveCourier,
  findUser: prisma.user.findFirst,
};

afterEach(() => {
  prisma.order.findUnique = originals.findOrder;
  prisma.deliveryLocation.findMany = originals.findLocations;
  getOsrmDeliveryRouteService.execute = originals.getRoute;
  courierAccessService.assertActiveCourier = originals.assertActiveCourier;
  prisma.user.findFirst = originals.findUser;
});

function order(overrides = {}) {
  return {
    id: 91,
    userId: 12,
    restaurantId: 7,
    assignedCourierId: 31,
    status: OrderStatus.SAIU_PARA_ENTREGA,
    type: OrderType.DELIVERY,
    address: 'Rua das Flores',
    number: '123',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'CE',
    deliveryStartedAt: new Date('2026-08-24T15:00:00.000Z'),
    deliveredAt: null,
    assignedCourier: { id: 31, name: 'Alex', phone: '85999999999', avatar: null },
    ...overrides,
  };
}

test('cliente dono recebe rastro, destino salvo e geometria da rota', async () => {
  prisma.order.findUnique = async () => order();
  prisma.deliveryLocation.findMany = async () => [
    {
      latitude: '-3.7319000',
      longitude: '-38.5267000',
      heading: 90,
      speed: 8,
      accuracy: 10,
      recordedAt: new Date('2026-08-24T15:01:00.000Z'),
    },
  ];
  getOsrmDeliveryRouteService.execute = async (input) => {
    assert.equal(input.destination.address, 'Rua das Flores');
    assert.equal(input.destination.number, '123');
    return {
      durationSeconds: 600,
      distanceMeters: 4200,
      provider: 'OSRM',
      destination: {
        latitude: -3.74,
        longitude: -38.51,
        label: 'Rua das Flores, 123, Centro, Fortaleza, CE, Brasil',
      },
      routeCoordinates: [
        { latitude: -3.7319, longitude: -38.5267 },
        { latitude: -3.74, longitude: -38.51 },
      ],
    };
  };

  const result = await getDeliveryTrackingService.execute({
    orderId: 91,
    userId: 12,
    restaurantId: 7,
    role: UserRole.CLIENTE,
  });

  assert.equal(result.locations[0].latitude, -3.7319);
  assert.equal(result.latestLocation.longitude, -38.5267);
  assert.equal(result.order.routeEstimate.destination.latitude, -3.74);
  assert.equal(result.order.routeEstimate.routeCoordinates.length, 2);
  assert.match(result.order.routeEstimate.destination.label, /Rua das Flores/);
});

test('nega outro cliente, outro motoqueiro e pedido que não seja delivery', async () => {
  prisma.deliveryLocation.findMany = async () => {
    throw new Error('não deveria consultar o rastro');
  };

  prisma.order.findUnique = async () => order();
  await assert.rejects(
    () =>
      getDeliveryTrackingService.execute({
        orderId: 91,
        userId: 13,
        restaurantId: 7,
        role: UserRole.CLIENTE,
      }),
    /não pode acompanhar/,
  );

  await assert.rejects(
    () =>
      getDeliveryTrackingService.execute({
        orderId: 91,
        userId: 32,
        restaurantId: 7,
        role: UserRole.MOTOQUEIRO,
      }),
    /não pode acompanhar/,
  );

  prisma.order.findUnique = async () => order({ type: OrderType.RETIRADA });
  await assert.rejects(
    () =>
      getDeliveryTrackingService.execute({
        orderId: 91,
        userId: 12,
        restaurantId: 7,
        role: UserRole.CLIENTE,
      }),
    /apenas para pedidos de delivery/,
  );
});

test('motoqueiro atribuído precisa manter conta ativa no mesmo tenant', async () => {
  prisma.order.findUnique = async () => order();
  prisma.deliveryLocation.findMany = async () => [];
  let activeCheck;
  courierAccessService.assertActiveCourier = async (courierId, restaurantId) => {
    activeCheck = { courierId, restaurantId };
    return { id: courierId, restaurantId };
  };

  await getDeliveryTrackingService.execute({
    orderId: 91,
    userId: 31,
    restaurantId: 7,
    role: UserRole.MOTOQUEIRO,
  });

  assert.deepEqual(activeCheck, { courierId: 31, restaurantId: 7 });
});

test('admin precisa continuar ativo no restaurante do pedido', async () => {
  prisma.order.findUnique = async () => order();
  prisma.deliveryLocation.findMany = async () => [];
  prisma.user.findFirst = async ({ where }) =>
    where.id === 41 && where.restaurantId === 7 ? { id: 41 } : null;

  await getDeliveryTrackingService.execute({
    orderId: 91,
    userId: 41,
    restaurantId: 7,
    role: UserRole.ADMIN,
  });

  prisma.user.findFirst = async () => null;
  await assert.rejects(
    () =>
      getDeliveryTrackingService.execute({
        orderId: 91,
        userId: 41,
        restaurantId: 7,
        role: UserRole.ADMIN,
      }),
    /administrador não está ativa/i,
  );
});
