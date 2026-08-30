import assert from 'node:assert/strict';
import test from 'node:test';
import { toPublicPaymentMethod } from './paymentMethodSecurity.js';

test('never exposes the PagBank token in a customer payment method response', () => {
  const output = toPublicPaymentMethod({
    publicId: 'safe-public-id', provider: 'PAGBANK', providerPaymentMethodId: 'CARD_SECRET_TOKEN',
    brand: 'visa', last4: '4242', expMonth: 12, expYear: 2030, holderName: 'Samuel Gomes',
    isDefault: true, createdAt: new Date('2026-08-30T00:00:00Z'),
  });
  assert.equal(JSON.stringify(output).includes('CARD_SECRET_TOKEN'), false);
  assert.deepEqual(Object.keys(output).sort(), [
    'brand', 'createdAt', 'expMonth', 'expYear', 'holderName', 'isDefault', 'last4', 'provider', 'publicId',
  ]);
});
