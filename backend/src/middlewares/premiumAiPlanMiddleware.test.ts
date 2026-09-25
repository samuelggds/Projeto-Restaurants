// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import { premiumAiPlanMiddleware } from './premiumAiPlanMiddleware.js';

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

test('permite IA para Premium ativo', async () => {
  prisma.subscription.findUnique = async ({ where }) => {
    assert.equal(where.restaurantId, 7);
    return { plan: 'PREMIUM', status: 'ATIVA' };
  };

  const req = { user: { restaurantId: 7 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumAiPlanMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('permite IA durante teste do Premium', async () => {
  prisma.subscription.findUnique = async () => ({ plan: 'PREMIUM', status: 'TESTE' });

  const req = { user: { restaurantId: 7 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumAiPlanMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('bloqueia IA e créditos para plano Básico', async () => {
  prisma.subscription.findUnique = async () => ({ plan: 'BASICO', status: 'ATIVA' });

  const req = { user: { restaurantId: 7 } };
  const res = responseStub();
  let nextCalled = false;

  await premiumAiPlanMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PREMIUM_AI_PLAN_REQUIRED');
  assert.match(res.body.error, /somente no plano Premium/i);
});

test('bloqueia Premium expirado ou cancelado', async () => {
  for (const status of ['EXPIRADA', 'CANCELADA']) {
    prisma.subscription.findUnique = async () => ({ plan: 'PREMIUM', status });
    const req = { user: { restaurantId: 7 } };
    const res = responseStub();
    let nextCalled = false;

    await premiumAiPlanMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  }
});
