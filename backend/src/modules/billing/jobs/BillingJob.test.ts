// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import billingJob from './BillingJob.js';
import prisma from '../../../config/prisma.js';
import trialService from '../services/TrialService.js';
import invoiceService from '../services/InvoiceService.js';
import billingRepository from '../repositories/BillingRepository.js';

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
  updateInvoice: billingRepository.updateInvoice,
  findSubscriptionByRestaurantId: billingRepository.findSubscriptionByRestaurantId,
  updateSubscription: billingRepository.updateSubscription,
  deactivateRestaurant: billingRepository.deactivateRestaurant,
};

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  trialService.execute = originalMethods.trialExecute;
  invoiceService.execute = originalMethods.invoiceExecute;
  prisma.subscription.findMany = originalMethods.subscriptionFindMany;
  billingRepository.findPendingInvoices = originalMethods.findPendingInvoices;
  billingRepository.updateInvoice = originalMethods.updateInvoice;
  billingRepository.findSubscriptionByRestaurantId = originalMethods.findSubscriptionByRestaurantId;
  billingRepository.updateSubscription = originalMethods.updateSubscription;
  billingRepository.deactivateRestaurant = originalMethods.deactivateRestaurant;
});

test('processa itens posteriores em todas as fases e sinaliza falha ao JobRunner', async () => {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  trialService.execute = async () => {
    throw new AggregateError([new Error('trial provider detail')], 'trial phase failed');
  };
  prisma.subscription.findMany = async () => [
    { id: 1, restaurantId: 11 },
    { id: 2, restaurantId: 12 },
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

  const attemptedOverdueInvoices = [];
  const expiredSubscriptions = [];
  const deactivatedRestaurants = [];
  billingRepository.updateInvoice = async (invoiceId, data) => {
    attemptedOverdueInvoices.push(invoiceId);
    if (invoiceId === 201) {
      throw new Error('first overdue invoice failed');
    }
    return { id: invoiceId, ...data };
  };
  billingRepository.findSubscriptionByRestaurantId = async (restaurantId) => ({
    id: restaurantId + 1_000,
    restaurantId,
  });
  billingRepository.updateSubscription = async (subscriptionId, data) => {
    expiredSubscriptions.push(subscriptionId);
    return { id: subscriptionId, ...data };
  };
  billingRepository.deactivateRestaurant = async (restaurantId) => {
    deactivatedRestaurants.push(restaurantId);
    return { id: restaurantId, active: false };
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
  assert.deepEqual(attemptedOverdueInvoices, [201, 202]);
  assert.deepEqual(expiredSubscriptions, [1_022]);
  assert.deepEqual(deactivatedRestaurants, [22]);
});
