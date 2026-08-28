import assert from 'node:assert/strict';
import test from 'node:test';
import { canLogPasswordResetCode } from './RequestPasswordResetService.js';

test('never allows password reset codes in production logs', () => {
  assert.equal(canLogPasswordResetCode('production'), false);
});

test('keeps the local development fallback available', () => {
  assert.equal(canLogPasswordResetCode('development'), false);
  assert.equal(canLogPasswordResetCode('development', 'true'), true);
  assert.equal(canLogPasswordResetCode('test', 'true'), true);
});
