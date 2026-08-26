// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import { sessionMiddleware } from './sessionMiddleware.js';

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
    json(body) {
      this.body = body;
      return this;
    },
  };
}

for (const status of ['OPEN', 'CLOSING_REQUESTED']) {
  test(`mantém a sessão ${status} acessível pelo mesmo QR`, async () => {
    tableSessionRepository.findBySessionToken = async (sessionToken) => {
      assert.equal(sessionToken, 'session-secret');
      return {
        id: 55,
        publicId: '123e4567-e89b-42d3-a456-426614174001',
        tableId: 91,
        restaurantId: 7,
        status,
        expiresAt: new Date(Date.now() + 60_000),
      };
    };
    const req = { headers: { 'x-session-token': 'session-secret' } };
    const res = responseStub();
    let nextCalled = false;

    await sessionMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.tableSession, {
      id: 55,
      publicId: '123e4567-e89b-42d3-a456-426614174001',
      tableId: 91,
      restaurantId: 7,
      status,
    });
  });
}

test('rejeita sessão encerrada', async () => {
  tableSessionRepository.findBySessionToken = async () => ({
    id: 55,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
    tableId: 91,
    restaurantId: 7,
    status: 'CLOSED',
    expiresAt: new Date(Date.now() + 60_000),
  });
  const req = { headers: { 'x-session-token': 'session-secret' } };
  const res = responseStub();
  let nextCalled = false;

  await sessionMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /encerrada/i);
});
