import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import listGuestOrdersService from '../services/ListGuestOrdersService.js';
import jwt from 'jsonwebtoken';
import {
  issueGuestOrderOwnershipToken,
  verifyGuestOrderOwnershipToken,
  verifyGuestOrderOwnershipTokenByPublicId,
} from './guestOrderOwnershipToken.js';

const originalSecret = process.env.GUEST_ORDER_OWNERSHIP_SECRET;
type MutableFindMany = (...args: unknown[]) => Promise<unknown[]>;
const mutableOrder = prisma.order as unknown as { findMany: MutableFindMany };
const originalFindMany = mutableOrder.findMany;
const testSecret = 'test-guest-order-ownership-secret-that-is-long-enough';
process.env.GUEST_ORDER_OWNERSHIP_SECRET = testSecret;

test('emite comprovante restrito ao pedido e publicId', () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  assert.deepEqual(verifyGuestOrderOwnershipToken(token, 91), {
    orderId: 91,
    publicId: 'public-91',
  });
});

test('valida o mesmo comprovante pelo publicId da rota de pagamento', () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  assert.deepEqual(verifyGuestOrderOwnershipTokenByPublicId(token, 'public-91'), {
    orderId: 91,
    publicId: 'public-91',
  });
});

test('recusa usar o comprovante em outro publicId', () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  assert.throws(
    () => verifyGuestOrderOwnershipTokenByPublicId(token, 'public-92'),
    /Comprovação de propriedade do pedido inválida/,
  );
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

test('lista somente pedidos de visitante comprovados sem expor telefone', async () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 101, publicId: 'public-101' });
  mutableOrder.findMany = async () => [
    {
      id: 101,
      publicId: 'public-101',
      restaurantId: 7,
      status: 'PREPARANDO',
      type: 'DELIVERY',
      total: 42.5,
      paid: false,
      paymentMethod: 'PIX',
      createdAt: new Date(),
      updatedAt: new Date(),
      deliveryStartedAt: null,
      deliveredAt: null,
      restaurant: { id: 7, name: 'North Pizza' },
      user: { phone: '85999999999' },
      items: [{ quantity: 1, product: { name: 'Pizza', image: null } }],
    },
  ];

  const result = await listGuestOrdersService.execute({
    restaurantId: 7,
    proofs: [{ orderId: 101, token }],
  });

  assert.equal(result.total, 1);
  assert.equal(result.orders[0].id, 101);
  assert.equal('user' in result.orders[0], false);
});

test('ignora prova inválida sem consultar pedidos', async () => {
  let calls = 0;
  mutableOrder.findMany = async () => {
    calls += 1;
    return [];
  };

  const result = await listGuestOrdersService.execute({
    restaurantId: 7,
    proofs: [{ orderId: 101, token: 'invalido' }],
  });

  assert.deepEqual(result, { orders: [], total: 0 });
  assert.equal(calls, 0);
});

test('não retorna pedido cujo publicId diverge da prova assinada', async () => {
  const token = issueGuestOrderOwnershipToken({ orderId: 101, publicId: 'public-101' });
  mutableOrder.findMany = async () => [
    {
      id: 101,
      publicId: 'outro-public-id',
      restaurantId: 7,
      status: 'PENDENTE',
      type: 'DELIVERY',
      total: 20,
      paid: false,
      paymentMethod: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deliveryStartedAt: null,
      deliveredAt: null,
      restaurant: { id: 7, name: 'North Pizza' },
      user: { phone: '85999999999' },
      items: [],
    },
  ];

  const result = await listGuestOrdersService.execute({
    proofs: [{ orderId: 101, token }],
  });

  assert.deepEqual(result, { orders: [], total: 0 });
});

test.afterEach(() => {
  mutableOrder.findMany = originalFindMany;
});

test.after(() => {
  mutableOrder.findMany = originalFindMany;
  if (originalSecret === undefined) delete process.env.GUEST_ORDER_OWNERSHIP_SECRET;
  else process.env.GUEST_ORDER_OWNERSHIP_SECRET = originalSecret;
});
