import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveRetryCardPaymentType } from './RetryOrderCardPaymentService.js';

test('retry preserva débito quando o pedido anterior era débito', () => {
  assert.equal(resolveRetryCardPaymentType(undefined, 'debit'), 'debit');
  assert.equal(resolveRetryCardPaymentType(null, 'debit'), 'debit');
});

test('retry preserva crédito quando não existe intenção de débito anterior', () => {
  assert.equal(resolveRetryCardPaymentType(undefined, 'credit'), 'credit');
  assert.equal(resolveRetryCardPaymentType(undefined, undefined), 'credit');
});

test('retry recusa tipo de cartão manipulado em vez de fazer fallback silencioso', () => {
  assert.throws(
    () => resolveRetryCardPaymentType('debit-manipulado', 'credit'),
    /tipo de cartão inválido/i,
  );
});
