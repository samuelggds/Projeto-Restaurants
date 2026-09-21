import assert from 'node:assert/strict';
import test from 'node:test';
import { getTopUpReversal } from './AiCreditTopUpService.js';

test('contestação sem decisão mantém saldo em conciliação; chargeback confirmado reverte o total', () => {
  assert.equal(getTopUpReversal({ status: 'in_mediation' }, 3000).state, 'UNKNOWN');
  assert.deepEqual(getTopUpReversal({ status: 'charged_back' }, 3000), {
    state: 'CONFIRMED',
    cents: 3000,
    reason: 'CHARGED_BACK',
  });
});

test('Pix exige valor de estorno parcial válido e cumulativo', () => {
  assert.equal(
    getTopUpReversal({ status: 'approved', status_detail: 'partially_refunded' }, 3000).state,
    'UNKNOWN',
  );
  assert.equal(
    getTopUpReversal({ status: 'approved', transaction_amount_refunded: 31 }, 3000).state,
    'UNKNOWN',
  );
  assert.deepEqual(
    getTopUpReversal({ status: 'approved', transaction_amount_refunded: 10.5 }, 3000),
    { state: 'CONFIRMED', cents: 1050, reason: 'REFUNDED' },
  );
  assert.equal(
    getTopUpReversal(
      { status: 'refunded', status_detail: 'partially_refunded', transaction_amount_refunded: 10 },
      3000,
    ).cents,
    1000,
  );
});

test('Orders exige devoluções processadas vinculadas ao pagamento original, sem duplicatas', () => {
  const payment = { id: 'PAY-test', status: 'processed', status_detail: 'partially_refunded' };
  const refund = {
    id: 'REF-test',
    transaction_id: 'PAY-test',
    status: 'processed',
    amount: '10.00',
  };
  const result = (refunds: unknown[]) =>
    getTopUpReversal(payment, 3000, { transactions: { refunds } });
  assert.deepEqual(result([refund]), { state: 'CONFIRMED', cents: 1000, reason: 'REFUNDED' });
  for (const altered of [
    { ...refund, transaction_id: 'PAY-other' },
    { ...refund, status: 'processing' },
    { ...refund, amount: 'NaN' },
  ]) {
    assert.equal(result([altered]).state, 'UNKNOWN');
  }
  assert.equal(result([refund, refund]).state, 'UNKNOWN');
  assert.equal(result([{ ...refund, status: 'canceled' }]).state, 'UNKNOWN');
  assert.equal(result([refund, { ...refund, id: 'REF-2', amount: '20.01' }]).state, 'UNKNOWN');
  assert.equal(result([refund, { ...refund, id: 'REF-2', amount: '5.00' }]).cents, 1500);
});

test('estorno integral canônico confirma total; ausência de estorno mantém aprovação normal', () => {
  assert.equal(getTopUpReversal({ status: 'refunded' }, 3000).cents, 3000);
  assert.equal(getTopUpReversal({ status: 'approved' }, 3000).state, 'NONE');
  assert.equal(
    getTopUpReversal({ id: 'PAY-test', status: 'processed' }, 3000, {
      transactions: { refunds: [] },
    }).state,
    'NONE',
  );
});
