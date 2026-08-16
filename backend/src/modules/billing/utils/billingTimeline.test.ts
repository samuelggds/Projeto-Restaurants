import assert from 'node:assert/strict';
import test from 'node:test';
import { getBillingStartDate, getCompletedSubscriptionMonths } from './billingTimeline.js';

test('início da cobrança usa a data em que restaurante e admin já existem', () => {
  const restaurant = new Date('2026-01-02T12:00:00.000Z');
  const admin = new Date('2026-01-05T12:00:00.000Z');
  assert.equal(getBillingStartDate(restaurant, admin).toISOString(), admin.toISOString());
});

test('calcula meses completos desde o início da assinatura', () => {
  const startedAt = new Date('2026-01-15T12:00:00.000Z');
  assert.equal(getCompletedSubscriptionMonths(startedAt, new Date('2026-03-14T12:00:00.000Z')), 1);
  assert.equal(getCompletedSubscriptionMonths(startedAt, new Date('2026-03-15T12:00:00.000Z')), 2);
});
