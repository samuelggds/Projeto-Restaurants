// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import billingRepository from './BillingRepository.js';

test('liberação por pagamento altera somente bloqueios de origem BILLING', async () => {
  let received;
  const db = {
    restaurant: {
      updateMany: async (args) => {
        received = args;
        return { count: 0 };
      },
    },
  };

  await billingRepository.activateRestaurant(42, db);
  assert.deepEqual(received, {
    where: { id: 42, accessBlockReason: 'BILLING' },
    data: { active: true, accessBlockReason: 'NONE' },
  });
});

test('bloqueio financeiro nunca sobrescreve uma suspensão MANUAL', async () => {
  let received;
  const db = {
    restaurant: {
      updateMany: async (args) => {
        received = args;
        return { count: 0 };
      },
    },
  };

  await billingRepository.deactivateRestaurant(42, db);
  assert.deepEqual(received.where, {
    id: 42,
    accessBlockReason: { not: 'MANUAL' },
  });
  assert.equal(received.data.accessBlockReason, 'BILLING');
});
