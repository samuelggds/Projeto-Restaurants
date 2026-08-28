// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import trialService from './TrialService.js';
import invoiceService from './InvoiceService.js';
import billingRepository from '../repositories/BillingRepository.js';

const originalMethods = {
  findExpiredTrials: billingRepository.findExpiredTrials,
  updateSubscription: billingRepository.updateSubscription,
  invoiceExecute: invoiceService.execute,
};

afterEach(() => {
  billingRepository.findExpiredTrials = originalMethods.findExpiredTrials;
  billingRepository.updateSubscription = originalMethods.updateSubscription;
  invoiceService.execute = originalMethods.invoiceExecute;
});

test('continua processando os trials posteriores e agrega falhas individuais', async () => {
  billingRepository.findExpiredTrials = async () => [
    { id: 1, restaurantId: 101 },
    { id: 2, restaurantId: 102 },
    { id: 3, restaurantId: 103 },
  ];

  const attemptedRestaurants = [];
  const activatedSubscriptions = [];

  invoiceService.execute = async ({ restaurantId }) => {
    attemptedRestaurants.push(restaurantId);
    if (restaurantId === 102) {
      throw new Error('provider detail that must not become the aggregate message');
    }
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
