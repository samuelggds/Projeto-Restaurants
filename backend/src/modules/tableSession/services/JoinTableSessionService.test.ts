// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import joinTableSessionService, { TableSessionJoinError } from './JoinTableSessionService.js';
import joinTableParticipantService from './JoinTableParticipantService.js';

const originalResolve = resolvePublicTableService.execute;
const originalFindOpen = tableSessionRepository.findOpenedByTable;
const originalFindActive = tableSessionRepository.findActiveByTable;
const originalJoinParticipant = joinTableParticipantService.execute;

afterEach(() => {
  resolvePublicTableService.execute = originalResolve;
  tableSessionRepository.findOpenedByTable = originalFindOpen;
  tableSessionRepository.findActiveByTable = originalFindActive;
  joinTableParticipantService.execute = originalJoinParticipant;
});

const resolvedTable = {
  id: 91,
  number: 12,
  restaurantId: 7,
  restaurantSlug: 'restaurante-teste',
  tableOrderingEnabled: true,
  waiterCallEnabled: true,
  billRequestEnabled: false,
};

const participantJoinResult = {
  participant: {
    publicId: '123e4567-e89b-42d3-a456-426614174000',
    displayName: null,
    authenticated: false,
    status: 'ACTIVE',
    joinedAt: new Date(),
    leftAt: null,
  },
  participantToken: 'participant-secret',
  participantCookieName: 'table_participant_test',
  participantCookieExpiresAt: new Date('2026-08-25T00:00:00.000Z'),
  clearParticipantCookie: false,
};

test('entra automaticamente somente na sessão OPEN resolvida pelo token do QR', async () => {
  const token = 'a'.repeat(32);
  let resolvePayload;
  resolvePublicTableService.execute = async (payload) => {
    resolvePayload = payload;
    return resolvedTable;
  };
  tableSessionRepository.findActiveByTable = async (tableId) => {
    assert.equal(Number(tableId), 91);
    return {
      id: 55,
      publicId: '123e4567-e89b-42d3-a456-426614174001',
      restaurantId: 7,
      tableId: 91,
      status: 'OPEN',
      sessionToken: 'session-secret',
      expiresAt: new Date('2026-08-25T00:00:00.000Z'),
      table: { id: 91, number: 12, restaurantId: 7 },
    };
  };
  joinTableParticipantService.execute = async () => participantJoinResult;

  const result = await joinTableSessionService.execute({
    tableId: 91,
    tableNumber: 12,
    tableToken: token,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
  });

  assert.deepEqual(resolvePayload, {
    tableId: 91,
    tableNumber: 12,
    tableToken: token,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
  });
  assert.equal(result.sessionToken, 'session-secret');
  assert.equal(result.sessionId, 55);
  assert.equal(result.tableId, 91);
  assert.equal(result.restaurantId, 7);
  assert.equal(result.sessionStatus, 'OPEN');
  assert.equal(result.tableOrderingEnabled, true);
  assert.equal(result.billRequestEnabled, false);
  assert.equal(result.participant.publicId, '123e4567-e89b-42d3-a456-426614174000');
});

test('não libera o cardápio quando o garçom ainda não abriu a mesa', async () => {
  resolvePublicTableService.execute = async () => resolvedTable;
  tableSessionRepository.findActiveByTable = async () => null;

  await assert.rejects(
    () =>
      joinTableSessionService.execute({
        tableNumber: 12,
        tableToken: 'a'.repeat(32),
        restaurantSlug: 'restaurante-teste',
      }),
    (error: unknown) => {
      assert.ok(error instanceof TableSessionJoinError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, 'TABLE_NOT_OPEN');
      assert.match(error.message, /ainda não foi aberta pelo garçom/i);
      return true;
    },
  );
});

test('mantém a conta acessível e bloqueia novos pedidos quando o fechamento foi solicitado', async () => {
  resolvePublicTableService.execute = async () => resolvedTable;
  tableSessionRepository.findActiveByTable = async () => ({
    id: 55,
    publicId: '123e4567-e89b-42d3-a456-426614174001',
    restaurantId: 7,
    tableId: 91,
    status: 'CLOSING_REQUESTED',
    sessionToken: 'session-secret',
    expiresAt: new Date('2026-08-25T00:00:00.000Z'),
    table: { id: 91, number: 12, restaurantId: 7 },
  });
  joinTableParticipantService.execute = async ({ session }) => {
    assert.equal(session.id, 55);
    assert.equal(session.restaurantId, 7);
    return participantJoinResult;
  };

  const result = await joinTableSessionService.execute({
    tableNumber: 12,
    tableToken: 'a'.repeat(32),
    restaurantSlug: 'restaurante-teste',
  });

  assert.equal(result.sessionId, 55);
  assert.equal(result.sessionPublicId, '123e4567-e89b-42d3-a456-426614174001');
  assert.equal(result.sessionStatus, 'CLOSING_REQUESTED');
  assert.equal(result.tableOrderingEnabled, false);
  assert.equal(result.participant.publicId, participantJoinResult.participant.publicId);
});

test('não retorna sessão quando pedidos por mesa estão desativados', async () => {
  resolvePublicTableService.execute = async () => ({
    ...resolvedTable,
    tableOrderingEnabled: false,
  });
  let queried = false;
  tableSessionRepository.findActiveByTable = async () => {
    queried = true;
    return null;
  };

  await assert.rejects(
    () =>
      joinTableSessionService.execute({
        tableNumber: 12,
        tableToken: 'a'.repeat(32),
        restaurantSlug: 'restaurante-teste',
      }),
    /pedidos.*desativados/i,
  );
  assert.equal(queried, false);
});

test('repositório busca somente a sessão OPEN não expirada mais recente', async () => {
  let query;
  const fakeDb = {
    tableSession: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await tableSessionRepository.findOpenedByTable(91, 7, fakeDb);

  assert.equal(query.where.tableId, 91);
  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.status, 'OPEN');
  assert.equal(query.where.OR[0].expiresAt, null);
  assert.ok(query.where.OR[1].expiresAt.gt instanceof Date);
  assert.equal(query.include.table.select.number, true);
  assert.equal('token' in query.include.table.select, false);
  assert.deepEqual(query.orderBy, { openedAt: 'desc' });
});

test('repositório de token mantém OPEN e CLOSING_REQUESTED acessíveis, mas exclui encerradas e expiradas', async () => {
  let query;
  const fakeDb = {
    tableSession: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await tableSessionRepository.findBySessionToken('session-secret', fakeDb);

  assert.equal(query.where.sessionToken, 'session-secret');
  assert.deepEqual(query.where.status, {
    in: ['OPEN', 'CLOSING_REQUESTED'],
  });
  assert.ok(query.where.OR[1].expiresAt.gt instanceof Date);
  assert.equal(query.include.table.select.restaurantId, true);
  assert.equal('token' in query.include.table.select, false);
});
