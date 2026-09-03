// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import prisma from '../config/prisma.js';
import tableParticipantRepository from '../modules/tableSession/repositories/TableParticipantRepository.js';
import { hashParticipantToken } from '../modules/tableSession/security/participantToken.js';
import tableParticipantStateService from '../modules/tableSession/services/TableParticipantStateService.js';
import { tableParticipantMiddleware } from './tableParticipantMiddleware.js';

const originalTransaction = prisma.$transaction;
const originalFindGuest = tableParticipantRepository.findGuestByTokenHash;
const originalFindUser = tableParticipantRepository.findByUser;
const originalGetState = tableParticipantStateService.getState;

beforeEach(() => {
  prisma.$transaction = async (callback) => callback({ $queryRaw: async () => [] });
  tableParticipantStateService.getState = async (_db, input) => {
    assert.deepEqual(input, {
      participantId: input.participantId,
      tableSessionId: 55,
      restaurantId: 7,
    });
    return {
      participantId: input.participantId,
      tableSessionId: 55,
      restaurantId: 7,
      phone: '85999999999',
      orderingBlockedAt: null,
      orderingUnblockedAt: null,
    };
  };
});

afterEach(() => {
  prisma.$transaction = originalTransaction;
  tableParticipantRepository.findGuestByTokenHash = originalFindGuest;
  tableParticipantRepository.findByUser = originalFindUser;
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
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const tableSession = {
  id: 55,
  publicId: '123e4567-e89b-42d3-a456-426614174001',
  tableId: 91,
  restaurantId: 7,
  status: 'OPEN',
};

test('cookie válido identifica somente o convidado da sessão e tenant atuais', async () => {
  const rawToken = 'd'.repeat(43);
  tableParticipantRepository.findGuestByTokenHash = async (hash, sessionId, restaurantId) => {
    assert.equal(hash, hashParticipantToken(rawToken));
    assert.deepEqual([sessionId, restaurantId], [55, 7]);
    return {
      id: 80,
      publicId: '123e4567-e89b-42d3-a456-426614174002',
      restaurantId: 7,
      tableSessionId: 55,
      userId: null,
      displayName: 'Samuel',
      status: 'ACTIVE',
      user: null,
    };
  };
  const req = {
    tableSession,
    headers: {
      cookie: `table_participant_${tableSession.publicId}=${rawToken}`,
    },
  };
  const res = responseStub();
  let nextCalled = false;

  await tableParticipantMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.tableParticipant.id, 80);
  assert.equal(req.tableParticipant.restaurantId, 7);
  assert.equal(req.tableParticipant.phone, '85999999999');
  assert.equal(req.tableParticipant.orderingBlocked, false);
  assert.equal(req.tableParticipant.authenticated, false);
});

test('token inválido, expirado ou de outra mesa não é aceito', async () => {
  let repositoryCalled = false;
  tableParticipantRepository.findGuestByTokenHash = async () => {
    repositoryCalled = true;
    return null;
  };
  const req = {
    tableSession,
    headers: {
      cookie: `table_participant_${tableSession.publicId}=token-invalido`,
    },
  };
  const res = responseStub();

  await tableParticipantMiddleware(req, res, () => {});

  assert.equal(repositoryCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'TABLE_PARTICIPANT_REQUIRED');
});

test('cliente logado é resolvido pelo usuário e ainda fica preso à sessão', async () => {
  tableParticipantRepository.findByUser = async (userId, sessionId, restaurantId) => {
    assert.deepEqual([userId, sessionId, restaurantId], [12, 55, 7]);
    return {
      id: 82,
      publicId: '123e4567-e89b-42d3-a456-426614174003',
      restaurantId: 7,
      tableSessionId: 55,
      userId: 12,
      displayName: null,
      status: 'ACTIVE',
      user: { name: 'Samuel Gomes' },
    };
  };
  const req = {
    user: { id: 12, role: 'CLIENTE', restaurantId: null },
    tableSession,
    headers: {},
  };
  const res = responseStub();

  await tableParticipantMiddleware(req, res, () => {});

  assert.equal(req.tableParticipant.displayName, 'Samuel Gomes');
  assert.equal(req.tableParticipant.authenticated, true);
});
