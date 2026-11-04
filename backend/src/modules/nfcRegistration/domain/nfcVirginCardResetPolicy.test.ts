import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isEmptyNfcVisitForReset } from './nfcVirginCardResetPolicy.js';

describe('NFC admin: reset only genuinely empty visits', () => {
  const empty = {
    status: 'OPEN' as const,
    totalCents: 0n, paidCents: 0n,
    itemCount: 0, orderCount: 0, ledgerCount: 0,
    gatewayCount: 0, pendingChallengeCount: 0, unresolvedServiceCallCount: 0,
  };
  it('allows a zero-consumption OPEN or UNPAID visit, not financial settlement', () => {
    assert.equal(isEmptyNfcVisitForReset(empty), true);
    assert.equal(isEmptyNfcVisitForReset({ ...empty, status: 'UNPAID' }), true);
    assert.equal(isEmptyNfcVisitForReset({ ...empty, status: 'PAID' }), false);
    assert.equal(isEmptyNfcVisitForReset({ ...empty, status: 'CANCELLED' }), false);
  });
  it('refuses any consumption, payment, pending order or unresolved assistance', () => {
    assert.equal(isEmptyNfcVisitForReset({ ...empty, totalCents: 100n }), false);
    assert.equal(isEmptyNfcVisitForReset({ ...empty, paidCents: 100n }), false);
    for (const key of ['itemCount', 'orderCount', 'ledgerCount', 'gatewayCount',
      'pendingChallengeCount', 'unresolvedServiceCallCount'] as const) {
      assert.equal(isEmptyNfcVisitForReset({ ...empty, [key]: 1 }), false, key);
    }
  });
});
