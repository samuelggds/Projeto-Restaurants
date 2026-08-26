// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import { hashParticipantToken } from '../security/participantToken.js';
import joinTableParticipantService from './JoinTableParticipantService.js';

const originals = {
  transaction: prisma.$transaction,
  findGuest: tableParticipantRepository.findGuestByTokenHash,
  findUser: tableParticipantRepository.findByUser,
  createGuest: tableParticipantRepository.createGuest,
  upsertUser: tableParticipantRepository.upsertAuthenticated,
  linkGuest: tableParticipantRepository.linkGuestToUser,
  updateName: tableParticipantRepository.updateDisplayName,
  revoke: tableParticipantRepository.revoke,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  tableParticipantRepository.findGuestByTokenHash = originals.findGuest;
  tableParticipantRepository.findByUser = originals.findUser;
  tableParticipantRepository.createGuest = originals.createGuest;
  tableParticipantRepository.upsertAuthenticated = originals.upsertUser;
  tableParticipantRepository.linkGuestToUser = originals.linkGuest;
  tableParticipantRepository.updateDisplayName = originals.updateName;
  tableParticipantRepository.revoke = originals.revoke;
});

const session = {
  id: 55,
  publicId: '123e4567-e89b-42d3-a456-426614174001',
  restaurantId: 7,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

function guestParticipant(overrides = {}) {
  return {
    id: 80,
    publicId: '123e4567-e89b-42d3-a456-426614174002',
    restaurantId: 7,
    tableSessionId: 55,
    userId: null,
    displayName: 'Samuel',
    tokenExpiresAt: session.expiresAt,
    status: 'ACTIVE',
    joinedAt: new Date('2026-08-25T12:00:00.000Z'),
    leftAt: null,
    revokedAt: null,
    user: null,
    ...overrides,
  };
}

test('cria convidado sem persistir ou devolver o token original no DTO público', async () => {
  tableParticipantRepository.findGuestByTokenHash = async () => null;
  let storedData;
  tableParticipantRepository.createGuest = async (data) => {
    storedData = data;
    return guestParticipant({ displayName: data.displayName, tokenExpiresAt: data.tokenExpiresAt });
  };

  const result = await joinTableParticipantService.execute({
    session,
    displayName: '  Samuel  ',
  });

  assert.match(result.participantToken, /^[a-zA-Z0-9_-]{43}$/);
  assert.equal(storedData.guestTokenHash, hashParticipantToken(result.participantToken));
  assert.notEqual(storedData.guestTokenHash, result.participantToken);
  assert.equal('guestTokenHash' in result.participant, false);
  assert.equal(result.participant.displayName, 'Samuel');
  assert.equal(result.participant.authenticated, false);
});

test('recarregar com cookie válido recupera o mesmo convidado sem duplicar', async () => {
  const rawToken = 'a'.repeat(43);
  let createCalled = false;
  tableParticipantRepository.findGuestByTokenHash = async (
    tokenHash,
    tableSessionId,
    restaurantId,
  ) => {
    assert.equal(tokenHash, hashParticipantToken(rawToken));
    assert.deepEqual([tableSessionId, restaurantId], [55, 7]);
    return guestParticipant();
  };
  tableParticipantRepository.createGuest = async () => {
    createCalled = true;
  };

  const result = await joinTableParticipantService.execute({
    session,
    cookies: { [`table_participant_${session.publicId}`]: rawToken },
  });

  assert.equal(result.participant.publicId, guestParticipant().publicId);
  assert.equal(result.participantToken, rawToken);
  assert.equal(createCalled, false);
});

test('token de outra mesa ou expirado não concede acesso e cria nova identidade', async () => {
  const rawToken = 'b'.repeat(43);
  let lookupScope;
  tableParticipantRepository.findGuestByTokenHash = async (_hash, sessionId, restaurantId) => {
    lookupScope = [sessionId, restaurantId];
    return null;
  };
  tableParticipantRepository.createGuest = async (data) =>
    guestParticipant({
      id: 81,
      publicId: data.publicId,
      displayName: null,
      tokenExpiresAt: data.tokenExpiresAt,
    });

  const result = await joinTableParticipantService.execute({
    session,
    cookies: { [`table_participant_${session.publicId}`]: rawToken },
  });

  assert.deepEqual(lookupScope, [55, 7]);
  assert.notEqual(result.participantToken, rawToken);
  assert.notEqual(result.participant.publicId, guestParticipant().publicId);
});

test('login associa o convidado ativo ao usuário sem criar outro participante', async () => {
  const rawToken = 'c'.repeat(43);
  const tx = {
    user: {
      findFirst: async ({ where }) => {
        assert.deepEqual(where, { id: 12, role: 'CLIENTE', active: true });
        return { id: 12 };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  tableParticipantRepository.findByUser = async () => null;
  tableParticipantRepository.findGuestByTokenHash = async () => guestParticipant();
  let linked;
  tableParticipantRepository.linkGuestToUser = async (...args) => {
    linked = args;
    return guestParticipant({ userId: 12, tokenExpiresAt: null, user: { name: 'Samuel' } });
  };

  const result = await joinTableParticipantService.execute({
    session,
    authenticatedUser: { id: 12, role: 'CLIENTE' },
    cookies: { [`table_participant_${session.publicId}`]: rawToken },
  });

  assert.deepEqual(linked.slice(0, 5), [80, 12, 'Samuel', 55, 7]);
  assert.equal(result.participant.authenticated, true);
  assert.equal(result.participantToken, null);
  assert.equal(result.clearParticipantCookie, true);
});

test('cliente autenticado precisa continuar ativo no banco', async () => {
  prisma.$transaction = async (callback) => callback({ user: { findFirst: async () => null } });

  await assert.rejects(
    () =>
      joinTableParticipantService.execute({
        session,
        authenticatedUser: { id: 12, role: 'CLIENTE' },
      }),
    /conta autenticada não está disponível/i,
  );
});

test('repositório rejeita convidado expirado e sempre consulta sessão e tenant juntos', async () => {
  let query;
  const fakeDb = {
    tableParticipant: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await originals.findGuest.call(tableParticipantRepository, 'f'.repeat(64), 55, 7, fakeDb);

  assert.equal(query.where.guestTokenHash, 'f'.repeat(64));
  assert.equal(query.where.tableSessionId, 55);
  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.status, 'ACTIVE');
  assert.equal(query.where.revokedAt, null);
  assert.ok(query.where.tokenExpiresAt.gt instanceof Date);
});
