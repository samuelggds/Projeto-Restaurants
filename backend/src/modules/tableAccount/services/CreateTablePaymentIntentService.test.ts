import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldAutoApproveFakeTablePayment } from './CreateTablePaymentIntentService.js';

test('autoaprovação fake exige opt-in explícito fora de test e production', () => {
  assert.equal(shouldAutoApproveFakeTablePayment({ NODE_ENV: 'development' }), false);
  assert.equal(
    shouldAutoApproveFakeTablePayment({
      NODE_ENV: 'development',
      FAKE_TABLE_PAYMENT_AUTO_APPROVE: 'false',
    }),
    false,
  );
  assert.equal(
    shouldAutoApproveFakeTablePayment({
      NODE_ENV: 'development',
      FAKE_TABLE_PAYMENT_AUTO_APPROVE: 'TRUE',
    }),
    false,
  );
  assert.equal(
    shouldAutoApproveFakeTablePayment({
      NODE_ENV: 'development',
      FAKE_TABLE_PAYMENT_AUTO_APPROVE: 'true',
    }),
    true,
  );
  assert.equal(
    shouldAutoApproveFakeTablePayment({
      NODE_ENV: 'test',
      FAKE_TABLE_PAYMENT_AUTO_APPROVE: 'true',
    }),
    false,
  );
  assert.equal(
    shouldAutoApproveFakeTablePayment({
      NODE_ENV: 'production',
      FAKE_TABLE_PAYMENT_AUTO_APPROVE: 'true',
    }),
    false,
  );
});