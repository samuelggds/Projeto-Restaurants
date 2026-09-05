import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import {
  issueGuestOrderTrackingToken,
  verifyGuestOrderTrackingToken,
} from './guestOrderTrackingToken.js';

const originalSecret = process.env.GUEST_ORDER_TRACKING_SECRET;
const testSecret = 'test-guest-order-tracking-secret-that-is-long-enough';
process.env.GUEST_ORDER_TRACKING_SECRET = testSecret;

test('emite acesso de visitante restrito ao pedido e publicId', () => {
  const token = issueGuestOrderTrackingToken({ orderId: 81, publicId: 'public-81' });
  assert.deepEqual(verifyGuestOrderTrackingToken(token, 81), {
    orderId: 81,
    publicId: 'public-81',
  });
});

test('recusa reutilizar token em outro pedido', () => {
  const token = issueGuestOrderTrackingToken({ orderId: 81, publicId: 'public-81' });
  assert.throws(() => verifyGuestOrderTrackingToken(token, 82), /Acesso de visitante inválido/);
});

test('recusa token adulterado', () => {
  const token = issueGuestOrderTrackingToken({ orderId: 81, publicId: 'public-81' });
  const tampered = `${token.slice(0, -2)}aa`;
  assert.throws(() => verifyGuestOrderTrackingToken(tampered, 81));
});

test('recusa token assinado com algoritmo diferente de HS256', () => {
  const token = jwt.sign(
    { type: 'guest-order-tracking', orderId: 81, publicId: 'public-81' },
    testSecret,
    {
      algorithm: 'HS384',
      issuer: 'projeto-restaurants',
      audience: 'guest-order-tracking',
      expiresIn: '3d',
    },
  );
  assert.throws(() => verifyGuestOrderTrackingToken(token, 81), /invalid algorithm/i);
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.GUEST_ORDER_TRACKING_SECRET;
  else process.env.GUEST_ORDER_TRACKING_SECRET = originalSecret;
});