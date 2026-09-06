import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import {
  issueGuestOrderOwnershipToken,
  verifyGuestOrderOwnershipToken,
} from './guestOrderOwnershipToken.js';

const originalSecret = process.env.GUEST_ORDER_OWNERSHIP_SECRET;
const testSecret = 'test-guest-order-ownership-secret-that-is-long-enough';
process.env.GUEST_ORDER_OWNERSHIP_SECRET = testSecret;

test('emite comprovante restrito ao pedido e publicId', () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  assert.deepEqual(verifyGuestOrderOwnershipToken(token, 91), {
    orderId: 91,
    publicId: 'public-91',
  });
});

test('recusa usar o comprovante em outro pedido', () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  assert.throws(
    () => verifyGuestOrderOwnershipToken(token, 92),
    /Comprovação de propriedade do pedido inválida/,
  );
});

test('recusa comprovante adulterado', () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  assert.throws(() => verifyGuestOrderOwnershipToken(`${token.slice(0, -2)}aa`, 91));
});

test('recusa algoritmo diferente de HS256', () => {
  const token = jwt.sign(
    { type: 'guest-order-ownership', orderId: 91, publicId: 'public-91' },
    testSecret,
    {
      algorithm: 'HS384',
      issuer: 'projeto-restaurants',
      audience: 'guest-order-ownership',
      expiresIn: '90d',
    },
  );
  assert.throws(() => verifyGuestOrderOwnershipToken(token, 91), /invalid algorithm/i);
});

test.after(() => {
  if (originalSecret === undefined) delete process.env.GUEST_ORDER_OWNERSHIP_SECRET;
  else process.env.GUEST_ORDER_OWNERSHIP_SECRET = originalSecret;
});
