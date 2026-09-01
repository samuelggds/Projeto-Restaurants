import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesOrderPaymentEvidence } from './paymentEvidence.js';

test('compara valores decimais e minor units em centavos exatos', () => {
  assert.equal(
    matchesOrderPaymentEvidence({
      expectedAmount: '79.90',
      providerAmount: 79.9,
      providerCurrency: 'brl',
    }),
    true,
  );
  assert.equal(
    matchesOrderPaymentEvidence({
      expectedAmount: 79.9,
      providerAmount: 7_990,
      providerAmountUnit: 'MINOR',
      providerCurrency: 'BRL',
    }),
    true,
  );
});

test('rejeita valor, moeda ou campos financeiros divergentes', () => {
  const evidence = {
    expectedAmount: 79.9,
    providerAmount: 79.9,
    providerCurrency: 'BRL',
  };

  assert.equal(matchesOrderPaymentEvidence({ ...evidence, providerAmount: 79.89 }), false);
  assert.equal(matchesOrderPaymentEvidence({ ...evidence, providerCurrency: 'USD' }), false);
  assert.equal(matchesOrderPaymentEvidence({ ...evidence, providerAmount: null }), false);
  assert.equal(matchesOrderPaymentEvidence({ ...evidence, providerCurrency: '' }), false);
  assert.equal(
    matchesOrderPaymentEvidence({
      ...evidence,
      providerAmount: 7_990.5,
      providerAmountUnit: 'MINOR',
    }),
    false,
  );
});
