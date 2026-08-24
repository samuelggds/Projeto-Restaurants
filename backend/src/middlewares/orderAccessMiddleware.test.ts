// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { TableSessionStatus } from '@prisma/client';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import { orderAccessMiddleware } from './orderAccessMiddleware.js';

const originalFindBySessionToken = tableSessionRepository.findBySessionToken;

afterEach(() => {
  tableSessionRepository.findBySessionToken = originalFindBySessionToken;
});

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const openTableOneSession = {
  id: 55,
  tableId: 91,
  sessionToken: 'session-secret',
  status: TableSessionStatus.OPEN,
  expiresAt: new Date(Date.now() + 60_000),
  table: { id: 91, number: 1, active: true, restaurantId: 7 },
};

test('pedido MESA herda mesa e tenant exclusivamente da sessão validada', async () => {
  tableSessionRepository.findBySessionToken = async (token) => {
    assert.equal(token, 'session-secret');
    return openTableOneSession;
  };
  const req = {
    headers: { 'x-session-token': 'session-secret' },
    body: { type: 'MESA', restaurantId: 999 },
  };
  const res = responseStub();
  let nextCalled = false;

  await orderAccessMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.body.tableId, 91);
  assert.equal(req.tableSession.tableId, 91);
  assert.equal(req.user.restaurantId, 7);
});

test('pedido não pode trocar a Mesa 1 da sessão por outra mesa no payload', async () => {
  tableSessionRepository.findBySessionToken = async () => openTableOneSession;
  const req = {
    headers: { 'x-session-token': 'session-secret' },
    body: { type: 'MESA', restaurantId: 7, tableId: 92 },
  };
  const res = responseStub();
  let nextCalled = false;

  await orderAccessMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /sessão da mesa inválida/i);
});

test('pedido de mesa sem sessão orienta o acesso pelo QR oficial', async () => {
  const req = { headers: {}, body: { type: 'MESA', tableId: 91 } };
  const res = responseStub();

  await orderAccessMiddleware(req, res, () => {
    throw new Error('next não deveria ser chamado');
  });

  assert.equal(res.statusCode, 401);
  assert.match(res.body.error, /QR Code oficial/i);
});
