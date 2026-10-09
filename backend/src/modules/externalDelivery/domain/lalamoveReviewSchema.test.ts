import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertLalamoveReviewTransition,
  lalamoveReviewUpdateSchema,
} from './lalamoveReviewSchema.js';

test('review never supports CONNECTED or ACTIVE', () => {
  assert.equal(lalamoveReviewUpdateSchema.safeParse({
    status: 'CONNECTED', expectedStatus: 'REQUESTED',
    expectedUpdatedAt: '2026-10-09T19:00:00.000Z', reasonCode: null,
  }).success, false);
});
test('requires a reason code for suspending or requesting info', () => {
  assert.equal(lalamoveReviewUpdateSchema.safeParse({
    status: 'SUSPENDED', expectedStatus: 'REQUESTED',
    expectedUpdatedAt: '2026-10-09T19:00:00.000Z', reasonCode: null,
  }).success, false);
});
test('rejects secrets, unknown properties and manual credentials', () => {
  assert.equal(lalamoveReviewUpdateSchema.safeParse({
    status: 'IN_REVIEW', expectedStatus: 'REQUESTED',
    expectedUpdatedAt: '2026-10-09T19:00:00.000Z',
    reasonCode: null, apiSecret: 'redacted',
  }).success, false);
});
test('prevents illegal status transitions', () => {
  assert.doesNotThrow(() => assertLalamoveReviewTransition('REQUESTED', 'IN_REVIEW'));
  assert.throws(() => assertLalamoveReviewTransition('IN_REVIEW', 'REQUESTED'), /não permitida/);
  assert.throws(() => assertLalamoveReviewTransition('SUSPENDED', 'ACTION_REQUIRED'), /não permitida/);
});
