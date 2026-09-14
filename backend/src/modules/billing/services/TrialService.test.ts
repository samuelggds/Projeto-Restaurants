// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import trialService from './TrialService.js';
import invoiceService from './InvoiceService.js';
import billingRepository from '../repositories/BillingRepository.js';
import prisma from '../../../config/prisma.js';

const originalMethods = {
  findMany: prisma.subscription.findMany,
  updateSubscription: billingRepository.updateSubscription,
  invoiceExecute: invoiceService.execute,
};

afterEach(() => {
  prisma.subscription.findMany = originalMethods.findMany;
  billingRepository.updateSubscription = originalMethods.updateSubscription;
  invoiceService.execute = originalMethods.invoiceExecute;
});

test('cria fatura na janela anterior ao fim do trial sem ativar antes do vencimento', async () => {
  const now = Date.now();
  const due = new Date(now + 2 * 24 * 60 * 60 * 1000);
  prisma.subscription.findMany = async () => [
    {
      id: 1,
      restaurantId: 101,
      status: 'TESTE',
      trialEndsAt: due,
      currentPeriodStart: new Date(now - 28 * 24 * 60 * 60 * 1000),
      currentPeriodEnd: due,
      createdAt: new Date(now - 28 * 24 * 60 * 60 * 1000),
    },
  ];

  const attemptedRestaurants = [];
  const activatedSubscriptions = [];
  invoiceService.execute = async ({ restaurantId }) => {
    attemptedRestaurants.push(restaurantId);
    return { id: restaurantId };
  };
  billingRepository.updateSubscription = async (subscriptionId, data) => {
    activatedSubscriptions.push([subscriptionId, data]);
    return { id: subscriptionId, ...data };
  };

  await trialService.execute();
  assert.deepEqual(attemptedRestaurants, [101]);
  assert.deepEqual(activatedSubscriptions, []);
});

test('continua processando trials posteriores e agrega falhas individuais', async () => {
  const expired = new Date(Date.now() - 60_000);
  prisma.subscription.findMany = async () => [
    { id: 1, restaurantId: 101, trialEndsAt: expired, currentPeriodEnd: expired, createdAt: expired },
    { id: 2, restaurantId: 102, trialEndsAt: expired, currentPeriodEnd: expired, createdAt: expired },
    { id: 3, restaurantId: 103, trialEndsAt: expired, currentPeriodEnd: expired, createdAt: expired },
  ];

  const attemptedRestaurants = [];
  const activatedSubscriptions = [];
  invoiceService.execute = async ({ restaurantId }) => {
    attemptedRestaurants.push(restaurantId);
    if (restaurantId === 102) throw new Error('provider detail');
    return { id: restaurantId };
  };
  billingRepository.updateSubscription = async (subscriptionId, data) => {
    activatedSubscriptions.push(subscriptionId);
    return { id: subscriptionId, ...data };
  };

  await assert.rejects(
    () => trialService.execute(),
    (failure) => {
      assert.ok(failure instanceof AggregateError);
      assert.equal(failure.message, 'Trial processing completed with failures.');
      assert.equal(failure.errors.length, 1);
      return true;
    },
  );

  assert.deepEqual(attemptedRestaurants, [101, 102, 103]);
  assert.deepEqual(activatedSubscriptions, [1, 3]);
});
