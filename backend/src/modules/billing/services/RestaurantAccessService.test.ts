// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { RestaurantAccessService } from './RestaurantAccessService.js';

function createDatabase({
  restaurant = { id: 7, active: true, accessBlockReason: 'NONE' },
  invoices = [],
  subscription = { status: 'ATIVA' },
} = {}) {
  const calls = {
    invoiceUpdates: [],
    subscriptionUpdates: [],
    restaurantUpdates: [],
    invoiceQueries: 0,
  };
  const db = {
    restaurant: {
      findUnique: async () => restaurant,
      updateMany: async (args) => {
        calls.restaurantUpdates.push(args);
        return { count: 1 };
      },
    },
    invoice: {
      findMany: async () => {
        calls.invoiceQueries += 1;
        return invoices;
      },
      updateMany: async (args) => {
        calls.invoiceUpdates.push(args);
        return { count: 1 };
      },
    },
    subscription: {
      findUnique: async () => subscription,
      updateMany: async (args) => {
        calls.subscriptionUpdates.push(args);
        return { count: 1 };
      },
    },
  };
  return { db, calls };
}

test('suspensão manual tem precedência e não é reclassificada como financeira', async () => {
  const { db, calls } = createDatabase({
    restaurant: { id: 7, active: false, accessBlockReason: 'MANUAL' },
    invoices: [{ id: 4, status: 'ATRASADO', dueDate: new Date('2026-01-01') }],
  });
  const decision = await new RestaurantAccessService().evaluate(7, db);

  assert.equal(decision.code, 'RESTAURANT_ACCESS_BLOCKED');
  assert.equal(decision.reason, 'MANUAL');
  assert.equal(calls.invoiceQueries, 0);
  assert.equal(calls.restaurantUpdates.length, 0);
});

test('fatura após a tolerância aplica bloqueio BILLING e preserva CANCELADA', async () => {
  const { db, calls } = createDatabase({
    invoices: [
      {
        id: 9,
        status: 'PENDENTE',
        dueDate: new Date('2026-01-01T12:00:00.000Z'),
        paymentLink: 'https://pay.test/9',
      },
    ],
    subscription: { status: 'CANCELADA' },
  });
  const decision = await new RestaurantAccessService().evaluate(
    7,
    db,
    new Date('2026-02-01T12:00:00.000Z'),
  );

  assert.equal(decision.code, 'BILLING_BLOCKED');
  assert.equal(decision.invoiceId, 9);
  assert.equal(calls.invoiceUpdates[0].where.status, 'PENDENTE');
  assert.deepEqual(calls.subscriptionUpdates[0].where, {
    restaurantId: 7,
    status: { not: 'CANCELADA' },
  });
  assert.equal(calls.restaurantUpdates[0].data.accessBlockReason, 'BILLING');
});

test('não libera automaticamente assinatura cancelada mesmo sem fatura aberta', async () => {
  const { db, calls } = createDatabase({
    restaurant: { id: 7, active: false, accessBlockReason: 'BILLING' },
    invoices: [],
    subscription: { status: 'CANCELADA' },
  });
  const decision = await new RestaurantAccessService().evaluate(7, db);

  assert.equal(decision.code, 'RESTAURANT_ACCESS_BLOCKED');
  assert.equal(calls.restaurantUpdates.length, 0);
  assert.equal(calls.subscriptionUpdates.length, 0);
});

test('cura um bloqueio financeiro obsoleto quando todas as faturas foram regularizadas', async () => {
  const { db, calls } = createDatabase({
    restaurant: { id: 7, active: false, accessBlockReason: 'BILLING' },
    invoices: [],
    subscription: { status: 'EXPIRADA' },
  });
  const decision = await new RestaurantAccessService().evaluate(7, db);

  assert.deepEqual(decision, { allowed: true, restaurantId: 7 });
  assert.equal(calls.restaurantUpdates[0].where.accessBlockReason, 'BILLING');
  assert.equal(calls.subscriptionUpdates[0].data.status, 'ATIVA');
});
