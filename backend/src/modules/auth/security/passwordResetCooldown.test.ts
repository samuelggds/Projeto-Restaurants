import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PASSWORD_RESET_CODE_TTL_MS,
  PASSWORD_RESET_RESEND_COOLDOWN_MS,
  isPasswordResetCoolingDown,
  passwordResetExpiryCutoff,
} from './passwordResetCooldown.js';

const issuedAt = new Date('2026-09-07T12:00:00.000Z');
const expiresAt = new Date(issuedAt.getTime() + PASSWORD_RESET_CODE_TTL_MS);

test('a first request without a pending code is allowed', () => {
  assert.equal(isPasswordResetCoolingDown(null, issuedAt), false);
});

test('resending is blocked until the full 30 seconds have elapsed', () => {
  assert.equal(PASSWORD_RESET_RESEND_COOLDOWN_MS, 30_000);
  assert.equal(isPasswordResetCoolingDown(expiresAt, issuedAt), true);
  assert.equal(
    isPasswordResetCoolingDown(expiresAt, new Date(issuedAt.getTime() + 29_999)),
    true,
  );
});

test('resending is allowed exactly at 30 seconds without shortening code validity', () => {
  assert.equal(PASSWORD_RESET_CODE_TTL_MS, 900_000);
  assert.equal(
    isPasswordResetCoolingDown(expiresAt, new Date(issuedAt.getTime() + 30_000)),
    false,
  );
});

test('expired codes do not block a new request', () => {
  assert.equal(isPasswordResetCoolingDown(expiresAt, new Date(expiresAt.getTime() + 1)), false);
});

test('the database cutoff and early check use the same inclusive boundary', () => {
  const cutoff = passwordResetExpiryCutoff(issuedAt);
  assert.equal(isPasswordResetCoolingDown(cutoff, issuedAt), false);
  assert.equal(isPasswordResetCoolingDown(new Date(cutoff.getTime() + 1), issuedAt), true);
});
