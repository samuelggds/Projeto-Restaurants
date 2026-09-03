// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import { TableSessionStatus } from '@prisma/client';
import prisma from '../config/prisma.js';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import tableParticipantRepository from '../modules/tableSession/repositories/TableParticipantRepository.js';
import {
  getParticipantCookieName,
  hashParticipantToken,
} from '../modules/tableSession/security/participantToken.js';
import tableParticipantStateService from '../modules/tableSession/services/TableParticipantStateService.js';
import { orderAccessMiddleware } from './orderAccessMiddleware.js';

const originalTransaction = prisma.$transaction;
const originalFindBySessionToken = tableSessionRepository.findBySessionToken;
const originalFindGuestByTokenHash = tableParticipantRepository.findGuestByTokenHash;
const originalGetState = tableParticipantStateService.getState;

beforeEach(() => {
  prisma.$transaction = async (callback) => callback({ $queryRaw: async () => [] });
  tableParticipantStateService.getState = async (_db, input) => ({
    participantId: input.participantId,
    tableSessionId: input.tableSessionId,
    restaurantId: input.restaurantId,
    phone: '85999999999',
    orderingBlockedAt: null,
    orderingUnblockedAt: null,
  });
});

afterEach(() => {
  prisma.$transaction = originalTransaction;
  tableSessionRepository.findBySessionToken = originalFindBySessionToken;
  tableParticipantRepository.findGuestByTokenHash = originalFindGuestByTokenHash;
  tableParticipantStateService.getState = originalGetState;
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
  publicId: '123e4567-e89b-42d3-a456-426614174001',
  tableId: 91,
  restaurantId: 7,
  sessionToken: 'session-secret',
  status: TableSessionStatus.OPEN,
  expiresAt: new Date(Date.now() + 60_000),
  table: { id: 91, number: 1, active: true, restaurantId: 7 },
};

test('pedido MESA herda mesa e tenant exclusivamente da sessão validada', async () => {
  const participantToken = 'a'.repeat(43);
  tableSessionRepository.findBySessionToken = async (token) => {
    assert.equal(token, 'session-secret');
    return openTableOneSession;
  };
  tableParticipantRepository.findGuestByTokenHash = async (
    tokenHash,
    tableSessionId,
    restaurantId,
  ) => {
    assert.equal(tokenHash, hashParticipantToken(participantToken));
    assert.deepEqual([tableSessionId, restaurantId], [55, 7]);
    return {
      id: 80,
      publicId: '123e4567-e89b-42d3-a456-426614174002',
      tableSessionId: 55,
      restaurantId: 7,
      userId: null,
      displayName: 'Samuel',
      user: null,
    };
  };
  const req = {
    headers: {
      'x-session-token': 'session-secret',
      cookie: `${getParticipantCookieName(openTableOneSession.publicId)}=${participantToken}`,
    },
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
  assert.equal(req.tableSession.restaurantId, 7);
  assert.equal(req.tableParticipant.id, 80);
  assert.equal(req.user, undefined);
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
