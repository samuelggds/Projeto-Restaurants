// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import billingJob from './BillingJob.js';
import prisma from '../../../config/prisma.js';
import trialService from '../services/TrialService.js';
import invoiceService from '../services/InvoiceService.js';
import billingRepository from '../repositories/BillingRepository.js';
import restaurantAccessService from '../services/RestaurantAccessService.js';

const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};
const originalMethods = {
  trialExecute: trialService.execute,
  invoiceExecute: invoiceService.execute,
  subscriptionFindMany: prisma.subscription.findMany,
  findPendingInvoices: billingRepository.findPendingInvoices,
  accessEvaluate: restaurantAccessService.evaluate,
};

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  trialService.execute = originalMethods.trialExecute;
  invoiceService.execute = originalMethods.invoiceExecute;
  prisma.subscription.findMany = originalMethods.subscriptionFindMany;
  billingRepository.findPendingInvoices = originalMethods.findPendingInvoices;
  restaurantAccessService.evaluate = originalMethods.accessEvaluate;
});

test('processa itens posteriores em todas as fases e sinaliza falha ao JobRunner', async () => {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  trialService.execute = async () => {
    throw new AggregateError([new Error('trial provider detail')], 'trial phase failed');
  };
  const dueSoon = new Date(Date.now() + 24 * 60 * 60 * 1000);
  prisma.subscription.findMany = async () => [
    { id: 1, restaurantId: 11, currentPeriodEnd: dueSoon, createdAt: new Date() },
    { id: 2, restaurantId: 12, currentPeriodEnd: dueSoon, createdAt: new Date() },
  ];

  const attemptedActiveRestaurants = [];
  invoiceService.execute = async ({ restaurantId }) => {
    attemptedActiveRestaurants.push(restaurantId);
    if (restaurantId === 11) {
      throw new Error('first active subscription failed');
    }
    return { id: restaurantId };
  };

  billingRepository.findPendingInvoices = async () => [
    {
      id: 201,
      restaurantId: 21,
      status: 'PENDENTE',
      dueDate: new Date('2000-01-01T00:00:00.000Z'),
    },
    {
      id: 202,
      restaurantId: 22,
      status: 'PENDENTE',
      dueDate: new Date('2000-01-01T00:00:00.000Z'),
    },
  ];

  const evaluatedRestaurants = [];
  restaurantAccessService.evaluate = async (restaurantId, db, now) => {
    evaluatedRestaurants.push({ restaurantId, db, now });
    if (restaurantId === 21) {
      throw new Error('first overdue invoice failed');
    }
    return { allowed: false, restaurantId, reason: 'BILLING' };
  };

  await assert.rejects(
    () => billingJob.execute(),
    (failure) => {
      assert.ok(failure instanceof AggregateError);
      assert.equal(failure.message, 'Billing job completed with failures.');
      assert.equal(failure.errors.length, 3);
      return true;
    },
  );

  assert.deepEqual(attemptedActiveRestaurants, [11, 12]);
  assert.deepEqual(
    evaluatedRestaurants.map(({ restaurantId }) => restaurantId),
    [21, 22],
  );
  assert.ok(evaluatedRestaurants.every(({ db }) => db === prisma));
  assert.ok(evaluatedRestaurants.every(({ now }) => now instanceof Date));
});
