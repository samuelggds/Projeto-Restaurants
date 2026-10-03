// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { UpdateRestaurantSubscriptionService } from './UpdateRestaurantSubscriptionService.js';

function subscription(overrides = {}) {
  return {
    id: 31,
    restaurantId: 7,
    plan: 'PREMIUM',
    status: 'ATIVA',
    trialEndsAt: null,
    currentPeriodStart: new Date('2026-09-01T00:00:00.000Z'),
    currentPeriodEnd: new Date('2026-10-01T00:00:00.000Z'),
    balanceDebt: 0,
    scheduledPlan: null,
    scheduledPlanEffectiveMonth: null,
    scheduledPlanEffectiveYear: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

function fixture() {
  let current = subscription();
  const updates = [];
  const audits = [];
  const transaction = {};
  const disabledDomains = [];
  const repository = {
    transaction: async (operation) => operation(transaction),
    findActor: async (actorUserId, db) => {
      assert.equal(actorUserId, 1);
      assert.equal(db, transaction);
      return { id: 1, name: 'Super Admin', role: 'SUPER_ADMIN' };
    },
    findRestaurantForMutation: async (restaurantId, db) => {
      assert.equal(restaurantId, 7);
      assert.equal(db, transaction);
      return { id: 7, name: 'Restaurante 7' };
    },
    findSubscription: async (restaurantId, db) => {
      assert.equal(restaurantId, 7);
      assert.equal(db, transaction);
      return { ...current };
    },
    findPlan: async () => null,
    updateSubscription: async (restaurantId, data, db) => {
      assert.equal(restaurantId, 7);
      assert.equal(db, transaction);
      updates.push(data);
      current = { ...current, ...data, updatedAt: new Date() };
      return { ...current };
    },
    disableRestaurantCustomDomain: async (restaurantId, actorUserId, db) => {
      assert.equal(restaurantId, 7);
      assert.equal(actorUserId, 1);
      assert.equal(db, transaction);
      disabledDomains.push(restaurantId);
      return { count: 1 };
    },
    createAuditLog: async (entry, db) => {
      assert.equal(db, transaction);
      audits.push(entry);
      return entry;
    },
  };
  return { repository, updates, audits, disabledDomains, getCurrent: () => current };
}

const context = {
  actorUserId: 1,
  ipAddress: null,
  requestId: 'req-test',
  userAgent: 'node-test',
};

test('CANCELADA só é persistida depois de cancelar a recorrência do provedor', async () => {
  const state = fixture();
  const calls = [];
  const recurringBilling = {
    cancelRecurringBilling: async (restaurantId) => {
      calls.push(restaurantId);
      assert.equal(state.updates.length, 0);
      return { status: 'CANCELED', autoRenew: false };
    },
  };
  const service = new UpdateRestaurantSubscriptionService(state.repository, recurringBilling);

  const result = await service.execute(
    7,
    { status: 'CANCELADA', reason: 'Encerramento solicitado pelo administrador.' },
    context,
  );

  assert.deepEqual(calls, [7]);
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].status, 'CANCELADA');
  assert.equal(state.audits.length, 1);
  assert.deepEqual(state.disabledDomains, [7]);
  assert.equal(result.status, 'CANCELADA');
});

test('falha ao cancelar no Mercado Pago preserva a assinatura local ativa', async () => {
  const state = fixture();
  const recurringBilling = {
    cancelRecurringBilling: async () => {
      throw new Error('Mercado Pago indisponível');
    },
  };
  const service = new UpdateRestaurantSubscriptionService(state.repository, recurringBilling);

  await assert.rejects(
    () =>
      service.execute(
        7,
        { status: 'CANCELADA', reason: 'Encerramento solicitado pelo administrador.' },
        context,
      ),
    /Mercado Pago indisponível/,
  );

  assert.equal(state.updates.length, 0);
  assert.equal(state.audits.length, 0);
  assert.equal(state.getCurrent().status, 'ATIVA');
});


test('downgrade para Básico desativa domínio personalizado', async () => {
  const state = fixture();
  state.repository.findPlan = async () => ({ code: 'BASICO', active: true });
  const recurringBilling = { cancelRecurringBilling: async () => ({}) };
  const service = new UpdateRestaurantSubscriptionService(state.repository, recurringBilling);

  const result = await service.execute(
    7,
    { planCode: 'BASICO', reason: 'Downgrade solicitado pelo restaurante.' },
    context,
  );

  assert.equal(result.planCode, 'BASICO');
  assert.deepEqual(state.disabledDomains, [7]);
});
