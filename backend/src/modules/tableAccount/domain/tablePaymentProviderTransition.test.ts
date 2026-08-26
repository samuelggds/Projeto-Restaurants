import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTablePaymentProviderTransition } from './tablePaymentProviderTransition.js';

test('confirma pagamento online apenas quando a reserva continua ativa', () => {
  assert.deepEqual(resolveTablePaymentProviderTransition('PROCESSING', 'PAID'), {
    nextStatus: 'PAID',
    eventType: 'PAID',
    latePayment: false,
  });
});

test('pagamento recusado libera o saldo por uma transição terminal', () => {
  assert.deepEqual(resolveTablePaymentProviderTransition('PROCESSING', 'FAILED'), {
    nextStatus: 'FAILED',
    eventType: 'FAILED',
    latePayment: false,
  });
});

test('aprovação depois da expiração não reabre a intenção e exige estorno', () => {
  assert.deepEqual(resolveTablePaymentProviderTransition('EXPIRED', 'PAID'), {
    nextStatus: null,
    eventType: 'PROVIDER_WEBHOOK',
    latePayment: true,
  });
});

test('evento repetido após pagamento não aplica uma segunda transição', () => {
  assert.deepEqual(resolveTablePaymentProviderTransition('PAID', 'PAID'), {
    nextStatus: null,
    eventType: 'PROVIDER_WEBHOOK',
    latePayment: false,
  });
});
