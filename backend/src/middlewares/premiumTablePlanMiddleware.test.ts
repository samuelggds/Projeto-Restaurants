// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import { premiumTablePlanMiddleware } from './premiumTablePlanMiddleware.js';
import { premiumTableOrderMiddleware } from './premiumTableOrderMiddleware.js';

const originalFindUnique = prisma.subscription.findUnique;

afterEach(() => {
  prisma.subscription.findUnique = originalFindUnique;
});

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('permite sistema de mesas para plano Premium ativo', async () => {
  prisma.subscription.findUnique = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    return { plan: 'PREMIUM', status: 'ATIVA' };
  };

  const req = { user: { restaurantId: 7 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumTablePlanMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('bloqueia sistema de mesas para plano Básico', async () => {
  prisma.subscription.findUnique = async () => ({ plan: 'BASICO', status: 'ATIVA' });

  const req = { user: { restaurantId: 7 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumTablePlanMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PREMIUM_TABLE_PLAN_REQUIRED');
  assert.match(res.body.error, /somente no plano Premium/i);
});

test('usa o restaurante da sessão para cliente de mesa sem login', async () => {
  prisma.subscription.findUnique = async ({ where }) => {
    assert.equal(where.restaurantId, 11);
    return { plan: 'PREMIUM', status: 'TESTE' };
  };

  const req = { tableSession: { restaurantId: 11 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumTablePlanMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('delivery continua disponível sem consultar trava Premium', async () => {
  let queriedSubscription = false;
  prisma.subscription.findUnique = async () => {
    queriedSubscription = true;
    return { plan: 'BASICO', status: 'ATIVA' };
  };

  const req = { body: { type: 'DELIVERY' }, user: { restaurantId: 7 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumTableOrderMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(queriedSubscription, false);
});

test('pedido de mesa exige Premium', async () => {
  prisma.subscription.findUnique = async () => ({ plan: 'BASICO', status: 'ATIVA' });

  const req = {
    body: { type: 'MESA' },
    tableSession: { restaurantId: 7 },
  };
  const res = responseStub();
  let nextCalled = false;

  await premiumTableOrderMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PREMIUM_TABLE_PLAN_REQUIRED');
});
