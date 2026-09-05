import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateDeliveryConfirmationCode,
  verifyDeliveryConfirmationCode,
} from './deliveryConfirmationCode.js';

const originalSecret = process.env.DELIVERY_CONFIRMATION_CODE_SECRET;
process.env.DELIVERY_CONFIRMATION_CODE_SECRET = 'test-delivery-confirmation-secret-that-is-long-enough';

const input = {
  orderId: 81,
  publicId: 'order-public-id-81',
  deliveryStartedAt: new Date('2026-09-05T14:00:00.000Z'),
};

test('gera código estável de quatro dígitos para a mesma entrega', () => {
  const first = generateDeliveryConfirmationCode(input);
  const second = generateDeliveryConfirmationCode(input);
  assert.match(first, /^\d{4}$/);
  assert.equal(second, first);
});

test('valida somente o código pertencente à mesma entrega', () => {
  const code = generateDeliveryConfirmationCode(input);
  assert.equal(verifyDeliveryConfirmationCode(code, input), true);
  assert.equal(verifyDeliveryConfirmationCode('99999', input), false);
  assert.equal(
    verifyDeliveryConfirmationCode(code, {
      ...input,
      deliveryStartedAt: new Date('2026-09-05T14:01:00.000Z'),
    }),
    false,
  );
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.DELIVERY_CONFIRMATION_CODE_SECRET;
  else process.env.DELIVERY_CONFIRMATION_CODE_SECRET = originalSecret;
});
