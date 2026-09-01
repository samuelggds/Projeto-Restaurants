// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { FuncionarioSubRole, OrderStatus, UserRole } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import listOrdersService from './ListOrdersService.js';
import courierAccessService from './CourierAccessService.js';
import prisma from '../../../config/prisma.js';

const originalFindAll = orderRepository.findAll;
const originalFindCourierOrders = orderRepository.findCourierOrders;
const originalAssertActiveCourier = courierAccessService.assertActiveCourier;
const originalTransaction = prisma.$transaction;

afterEach(() => {
  orderRepository.findAll = originalFindAll;
  orderRepository.findCourierOrders = originalFindCourierOrders;
  courierAccessService.assertActiveCourier = originalAssertActiveCourier;
  prisma.$transaction = originalTransaction;
});

test('motoqueiro usa consulta exclusiva e vinculada ao proprio usuario', async () => {
  courierAccessService.assertActiveCourier = async (courierId, restaurantId) => {
    assert.equal(courierId, 31);
    assert.equal(restaurantId, 7);
    return { id: courierId, restaurantId };
  };
  let genericQueryCalled = false;
  orderRepository.findAll = async () => {
    genericQueryCalled = true;
    return [];
  };
  orderRepository.findCourierOrders = async (restaurantId, courierId, status) => {
    assert.equal(restaurantId, 7);
    assert.equal(courierId, 31);
    assert.equal(status, OrderStatus.SAIU_PARA_ENTREGA);
    return [{ id: 99, assignedCourierId: courierId, deliveryDistanceMeters: null }];
  };
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [{ set_config: '7' }],
      courierCompensationPolicy: {
        findFirst: async () => ({
          model: 'FIXED_PER_DELIVERY',
          fixedAmount: 6,
          baseAmount: 0,
          includedDistanceMeters: 0,
          extraPerKmAmount: 0,
          ranges: [],
        }),
      },
    });

  const result = await listOrdersService.execute(
    7,
    OrderStatus.SAIU_PARA_ENTREGA,
    UserRole.MOTOQUEIRO,
    31,
  );

  assert.equal(genericQueryCalled, false);
  assert.equal(result[0].id, 99);
  assert.equal(result[0].assignedCourierId, 31);
  assert.deepEqual(result[0].courierEarningPreview, {
    available: true,
    amount: 6,
    model: 'FIXED_PER_DELIVERY',
    source: 'COURIER_OVERRIDE',
  });
});

test('motoqueiro sem id autenticado nao acessa entregas', async () => {
  await assert.rejects(
    () => listOrdersService.execute(7, undefined, UserRole.MOTOQUEIRO, null),
    /Motoqueiro inválido/,
  );
});

test('cozinha continua usando a consulta operacional do restaurante', async () => {
  let courierQueryCalled = false;
  orderRepository.findCourierOrders = async () => {
    courierQueryCalled = true;
    return [];
  };
  orderRepository.findAll = async (restaurantId, status) => {
    assert.equal(restaurantId, 7);
    assert.equal(status, OrderStatus.PRONTO);
    return [{ id: 10 }];
  };

  const result = await listOrdersService.execute(
    7,
    OrderStatus.PRONTO,
    UserRole.FUNCIONARIO,
    5,
    FuncionarioSubRole.COZINHA,
  );

  assert.equal(courierQueryCalled, false);
  assert.deepEqual(result, [{ id: 10 }]);
});
