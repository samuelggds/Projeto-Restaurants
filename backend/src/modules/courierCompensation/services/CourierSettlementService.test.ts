// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';

import prisma from '../../../config/prisma.js';
import { cashCollectedByOrder } from './CourierSettlementService.js';
import courierSettlementService from './CourierSettlementService.js';

const originalTransaction = prisma.$transaction;
afterEach(() => {
  prisma.$transaction = originalTransaction;
});

test('somente dinheiro contra entrega pago entra como valor recebido', () => {
  assert.equal(
    cashCollectedByOrder({
      payOnDelivery: true,
      payOnDeliveryMethod: PaymentMethod.DINHEIRO,
      paid: true,
      total: '87.50',
    }),
    8750n,
  );
});

test('PIX, cartão e dinheiro ainda não recebido não viram caixa do motoqueiro', () => {
  for (const candidate of [
    { payOnDelivery: true, payOnDeliveryMethod: PaymentMethod.PIX, paid: true },
    { payOnDelivery: true, payOnDeliveryMethod: PaymentMethod.CARTAO, paid: true },
    { payOnDelivery: true, payOnDeliveryMethod: PaymentMethod.DINHEIRO, paid: false },
    { payOnDelivery: false, payOnDeliveryMethod: PaymentMethod.DINHEIRO, paid: true },
  ]) {
    assert.equal(cashCollectedByOrder({ ...candidate, total: '90.00' }), 0n);
  }
});

function baseTx(overrides = {}) {
  return {
    $queryRaw: async () => [{ set_config: '7' }],
    user: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, {
          id: 31,
          restaurantId: 7,
          role: UserRole.MOTOQUEIRO,
          active: true,
        });
        return { id: 31, name: 'Rider', email: 'rider@example.com', active: true };
      },
    },
    order: {
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
    },
    courierSettlementItem: {
      findFirst: async () => null,
      createMany: async () => ({ count: 0 }),
      updateMany: async () => ({ count: 0 }),
    },
    courierSettlement: {
      create: async () => ({ id: 51, publicId: '11111111-1111-4111-8111-111111111111' }),
      findFirst: async () => null,
      findFirstOrThrow: async () => null,
      updateMany: async () => ({ count: 0 }),
    },
    auditLog: { create: async () => ({ id: 1 }) },
    ...overrides,
  };
}

test('criação prende pedidos ao tenant, motoqueiro, status entregue e não pago', async () => {
  let orderWhere;
  let settlementData;
  let itemData;
  const tx = baseTx();
  tx.order.findMany = async ({ where }) => {
    orderWhere = where;
    return [
      {
        id: 91,
        courierEarning: '12.00',
        total: '50.00',
        paid: true,
        payOnDelivery: true,
        payOnDeliveryMethod: PaymentMethod.DINHEIRO,
      },
    ];
  };
  tx.courierSettlement.create = async ({ data }) => {
    settlementData = data;
    return { id: 51, publicId: '11111111-1111-4111-8111-111111111111' };
  };
  tx.courierSettlementItem.createMany = async ({ data }) => {
    itemData = data;
    return { count: 1 };
  };
  tx.courierSettlement.findFirstOrThrow = async () => ({
    id: 51,
    publicId: '11111111-1111-4111-8111-111111111111',
    grossCourierEarnings: '12.00',
    cashCollectedAmount: '50.00',
    netAmount: '-38.00',
    courier: { id: 31, name: 'Rider', email: 'rider@example.com' },
    items: [],
  });
  prisma.$transaction = async (callback) => callback(tx);

  const result = await courierSettlementService.create({
    restaurantId: 7,
    courierId: 31,
    orderIds: [91],
    actor: { userId: 2, role: UserRole.ADMIN },
  });

  assert.deepEqual(orderWhere, {
    id: { in: [91] },
    restaurantId: 7,
    assignedCourierId: 31,
    status: OrderStatus.ENTREGUE,
    courierPaidAt: null,
  });
  assert.equal(settlementData.restaurantId, 7);
  assert.equal(settlementData.grossCourierEarnings, '12.00');
  assert.equal(settlementData.cashCollectedAmount, '50.00');
  assert.equal(settlementData.netAmount, '-38.00');
  assert.equal(itemData[0].restaurantId, 7);
  assert.equal(itemData[0].orderId, 91);
  assert.equal(result.direction, 'COURIER_RETURNS_CASH');
});

test('pedido real de outro tenant é recusado sem criar acerto', async () => {
  let createCalls = 0;
  const tx = baseTx();
  tx.order.findMany = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    return [];
  };
  tx.courierSettlement.create = async () => {
    createCalls += 1;
  };
  prisma.$transaction = async (callback) => callback(tx);
  await assert.rejects(
    () =>
      courierSettlementService.create({
        restaurantId: 7,
        courierId: 31,
        orderIds: [999],
        actor: { userId: 2, role: UserRole.ADMIN },
      }),
    /não pertencem a este motoqueiro/,
  );
  assert.equal(createCalls, 0);
});

test('conflito concorrente do índice parcial é convertido em erro seguro', async () => {
  const tx = baseTx();
  tx.order.findMany = async () => [
    {
      id: 91,
      courierEarning: 5,
      total: 0,
      paid: true,
      payOnDelivery: false,
      payOnDeliveryMethod: null,
    },
  ];
  tx.courierSettlementItem.createMany = async () => {
    throw { code: 'P2002' };
  };
  prisma.$transaction = async (callback) => callback(tx);
  await assert.rejects(
    () =>
      courierSettlementService.create({
        restaurantId: 7,
        courierId: 31,
        orderIds: [91],
        actor: { userId: 2, role: UserRole.ADMIN },
      }),
    /acabou de ser incluída em outro acerto/,
  );
});

test('confirmação do motoqueiro marca somente pedidos entregues do próprio tenant', async () => {
  let settlementWhere;
  let orderUpdate;
  const tx = baseTx();
  tx.courierSettlement.findFirst = async ({ where }) => {
    settlementWhere = where;
    return { id: 51, status: 'AWAITING_COURIER_CONFIRMATION', items: [{ orderId: 91 }] };
  };
  tx.courierSettlement.updateMany = async () => ({ count: 1 });
  tx.order.updateMany = async (args) => {
    orderUpdate = args;
    return { count: 1 };
  };
  tx.courierSettlement.findFirstOrThrow = async () => ({
    id: 51,
    grossCourierEarnings: 10,
    cashCollectedAmount: 0,
    netAmount: 10,
    courier: { id: 31, name: 'Rider', email: 'rider@example.com' },
    items: [],
  });
  prisma.$transaction = async (callback) => callback(tx);
  await courierSettlementService.confirm({
    restaurantId: 7,
    courierId: 31,
    publicId: '11111111-1111-4111-8111-111111111111',
    actor: { userId: 31, role: UserRole.MOTOQUEIRO },
  });
  assert.equal(settlementWhere.restaurantId, 7);
  assert.equal(settlementWhere.courierId, 31);
  assert.deepEqual(orderUpdate.where.id, { in: [91] });
  assert.equal(orderUpdate.where.restaurantId, 7);
  assert.equal(orderUpdate.where.assignedCourierId, 31);
  assert.equal(orderUpdate.where.status, OrderStatus.ENTREGUE);
  assert.equal(orderUpdate.where.courierPaidAt, null);
});

test('confirmação falha atomicamente se nem todos os pedidos puderem ser quitados', async () => {
  const tx = baseTx();
  tx.courierSettlement.findFirst = async () => ({
    id: 51,
    status: 'AWAITING_COURIER_CONFIRMATION',
    items: [{ orderId: 91 }, { orderId: 92 }],
  });
  tx.courierSettlement.updateMany = async () => ({ count: 1 });
  tx.order.updateMany = async () => ({ count: 1 });
  prisma.$transaction = async (callback) => callback(tx);

  await assert.rejects(
    () =>
      courierSettlementService.confirm({
        restaurantId: 7,
        courierId: 31,
        publicId: '11111111-1111-4111-8111-111111111111',
        actor: { userId: 31, role: UserRole.MOTOQUEIRO },
      }),
    /mudaram de estado/,
  );
});

test('confirmar duas vezes é idempotente e não reescreve pedidos', async () => {
  let orderUpdates = 0;
  const tx = baseTx();
  tx.courierSettlement.findFirst = async () => ({
    id: 51,
    status: 'CONFIRMED',
    items: [{ orderId: 91 }],
  });
  tx.courierSettlement.findFirstOrThrow = async () => ({
    id: 51,
    grossCourierEarnings: 5,
    cashCollectedAmount: 0,
    netAmount: 5,
    courier: { id: 31, name: 'Rider' },
    items: [],
  });
  tx.order.updateMany = async () => {
    orderUpdates += 1;
  };
  prisma.$transaction = async (callback) => callback(tx);
  await courierSettlementService.confirm({
    restaurantId: 7,
    courierId: 31,
    publicId: '11111111-1111-4111-8111-111111111111',
    actor: { userId: 31, role: UserRole.MOTOQUEIRO },
  });
  assert.equal(orderUpdates, 0);
});

test('divergência nunca marca courierPaidAt', async () => {
  let orderUpdates = 0;
  const tx = baseTx();
  tx.courierSettlement.updateMany = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    assert.equal(where.courierId, 31);
    return { count: 1 };
  };
  tx.courierSettlement.findFirstOrThrow = async () => ({
    id: 51,
    grossCourierEarnings: 5,
    cashCollectedAmount: 0,
    netAmount: 5,
    courier: { id: 31, name: 'Rider' },
    items: [],
  });
  tx.order.updateMany = async () => {
    orderUpdates += 1;
  };
  prisma.$transaction = async (callback) => callback(tx);
  await courierSettlementService.dispute({
    restaurantId: 7,
    courierId: 31,
    publicId: '11111111-1111-4111-8111-111111111111',
    reason: 'Pedido não confere',
    actor: { userId: 31, role: UserRole.MOTOQUEIRO },
  });
  assert.equal(orderUpdates, 0);
});

test('cancelamento concorrente não sobrescreve acerto já confirmado', async () => {
  let releasedItems = 0;
  const tx = baseTx();
  tx.courierSettlement.findFirst = async () => ({ id: 51, courierId: 31 });
  tx.courierSettlement.updateMany = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    assert.deepEqual(where.status.in, ['AWAITING_COURIER_CONFIRMATION', 'DISPUTED']);
    return { count: 0 };
  };
  tx.courierSettlementItem.updateMany = async () => {
    releasedItems += 1;
    return { count: 1 };
  };
  prisma.$transaction = async (callback) => callback(tx);

  await assert.rejects(
    () =>
      courierSettlementService.cancel({
        restaurantId: 7,
        publicId: '11111111-1111-4111-8111-111111111111',
        actor: { userId: 2, role: UserRole.ADMIN },
      }),
    /outra sessão/,
  );
  assert.equal(releasedItems, 0);
});
