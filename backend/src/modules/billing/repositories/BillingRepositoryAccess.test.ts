// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import billingRepository from './BillingRepository.js';

const originalTransaction = prisma.$transaction;

afterEach(() => {
  prisma.$transaction = originalTransaction;
});

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

test('regeneração de cobrança restringe update e SQL ao restaurante da fatura', async () => {
  let updateArgs;
  let rawQuery;
  prisma.$transaction = async (callback) =>
    callback({
      invoice: {
        update: async (args) => {
          updateArgs = args;
          return { id: 84, restaurantId: 17 };
        },
      },
      $executeRaw: async (query) => {
        rawQuery = query;
        return 1;
      },
    });

  await billingRepository.updateInvoicePaymentDetailsAndResetReconciliation(84, 17, {
    paymentLink: 'https://pagamento.exemplo/84',
  });

  assert.deepEqual(updateArgs.where, { id: 84, restaurantId: 17 });
  assert.deepEqual(rawQuery.values, [84, 17]);
  assert.match(rawQuery.strings.join(''), /"restaurantId"/);
});
