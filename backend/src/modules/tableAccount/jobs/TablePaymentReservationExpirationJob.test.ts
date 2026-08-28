// @ts-nocheck
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import prisma from '../../../config/prisma.js';
import job from './TablePaymentReservationExpirationJob.js';

const originalFindMany = prisma.tablePaymentIntent.findMany;
const originalTransaction = prisma.$transaction;
const originalConsoleError = console.error;

afterEach(() => {
  prisma.tablePaymentIntent.findMany = originalFindMany;
  prisma.$transaction = originalTransaction;
  console.error = originalConsoleError;
});

test('continua as demais mesas e sinaliza retry quando uma expiração falha', async () => {
  prisma.tablePaymentIntent.findMany = async () => [
    { restaurantId: 1, tableSessionId: 10 },
    { restaurantId: 2, tableSessionId: 20 },
  ];
  let transactionCalls = 0;
  prisma.$transaction = async () => {
    transactionCalls += 1;
    if (transactionCalls === 1) throw new Error('database secret should stay in the cause');
    return 0;
  };
  console.error = () => {};

  await assert.rejects(
    () => job.execute(new Date('2026-08-27T12:00:00.000Z')),
    (error) => {
      assert.equal(error instanceof AggregateError, true);
      assert.equal(error.message, 'Table payment reservation expiration completed with failures.');
      assert.equal(error.errors.length, 1);
      return true;
    },
  );

  assert.equal(transactionCalls, 2);
});
