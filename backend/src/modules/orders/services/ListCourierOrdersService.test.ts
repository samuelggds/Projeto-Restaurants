// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { OrderStatus, UserRole } from '@prisma/client';
import orderRepository from '../repositories/OrderRepository.js';
import listOrdersService from './ListOrdersService.js';

const originalFindAll = orderRepository.findAll;
const originalFindCourierOrders = orderRepository.findCourierOrders;

afterEach(() => {
  orderRepository.findAll = originalFindAll;
  orderRepository.findCourierOrders = originalFindCourierOrders;
});

test('motoqueiro usa consulta exclusiva e vinculada ao proprio usuario', async () => {
  let genericQueryCalled = false;
  orderRepository.findAll = async () => {
    genericQueryCalled = true;
    return [];
  };
  orderRepository.findCourierOrders = async (restaurantId, courierId, status) => {
    assert.equal(restaurantId, 7);
    assert.equal(courierId, 31);
    assert.equal(status, OrderStatus.SAIU_PARA_ENTREGA);
    return [{ id: 99, assignedCourierId: courierId }];
  };

  const result = await listOrdersService.execute(
    7,
    OrderStatus.SAIU_PARA_ENTREGA,
    UserRole.MOTOQUEIRO,
    31,
  );

  assert.equal(genericQueryCalled, false);
  assert.deepEqual(result, [{ id: 99, assignedCourierId: 31 }]);
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

  const result = await listOrdersService.execute(7, OrderStatus.PRONTO, UserRole.FUNCIONARIO, 5);

  assert.equal(courierQueryCalled, false);
  assert.deepEqual(result, [{ id: 10 }]);
});
