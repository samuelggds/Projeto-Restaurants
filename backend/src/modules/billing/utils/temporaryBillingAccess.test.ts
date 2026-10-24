import assert from 'node:assert/strict';
import test from 'node:test';
import {
  hasActiveTemporaryBillingAccess,
  temporaryBillingAccessExpiresAt,
} from './temporaryBillingAccess.js';

test('autoriza apenas prazos predefinidos e calcula término exato em UTC', () => {
  const now = new Date('2026-10-24T12:00:00.000Z');
  assert.equal(temporaryBillingAccessExpiresAt(now, 1).toISOString(), '2026-10-25T12:00:00.000Z');
  assert.equal(temporaryBillingAccessExpiresAt(now, 3).toISOString(), '2026-10-27T12:00:00.000Z');
  assert.equal(temporaryBillingAccessExpiresAt(now, 7).toISOString(), '2026-10-31T12:00:00.000Z');
  assert.throws(() => temporaryBillingAccessExpiresAt(now, 14 as 1), /invalido/);
});

test('acesso temporário expira exatamente no limite e não aceita data inválida', () => {
  const expires = new Date('2026-10-27T12:00:00.000Z');
  assert.equal(hasActiveTemporaryBillingAccess(expires, new Date('2026-10-27T11:59:59.999Z')), true);
  assert.equal(hasActiveTemporaryBillingAccess(expires, expires), false);
  assert.equal(hasActiveTemporaryBillingAccess(expires, new Date('2026-10-27T12:00:01Z')), false);
  assert.equal(hasActiveTemporaryBillingAccess(null), false);
});
