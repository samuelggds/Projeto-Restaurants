// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import joinTableSessionService from './JoinTableSessionService.js';
import joinTableParticipantService from './JoinTableParticipantService.js';

const originalResolve = resolvePublicTableService.execute;
const originalFindOpen = tableSessionRepository.findOpenedByTable;
const originalJoinParticipant = joinTableParticipantService.execute;

afterEach(() => {
  resolvePublicTableService.execute = originalResolve;
  tableSessionRepository.findOpenedByTable = originalFindOpen;
  joinTableParticipantService.execute = originalJoinParticipant;
});

joinTableParticipantService.execute = async () => ({
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

test('entra automaticamente somente na sessão OPEN resolvida pelo token do QR', async () => {
  const token = 'a'.repeat(32);
  let resolvePayload;
  resolvePublicTableService.execute = async (payload) => {
    resolvePayload = payload;
    return resolvedTable;
  };
  tableSessionRepository.findOpenedByTable = async (tableId) => {
    assert.equal(Number(tableId), 91);
    return {
      id: 55,
      publicId: '123e4567-e89b-42d3-a456-426614174001',
      restaurantId: 7,
      tableId: 91,
      sessionToken: 'session-secret',
      expiresAt: new Date('2026-08-25T00:00:00.000Z'),
      table: { id: 91, number: 12, restaurantId: 7 },
    };
  };

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
  assert.equal(result.billRequestEnabled, false);
  assert.equal(result.participant.publicId, '123e4567-e89b-42d3-a456-426614174000');
});

test('não libera o cardápio quando o garçom ainda não abriu a mesa', async () => {
  resolvePublicTableService.execute = async () => resolvedTable;
  tableSessionRepository.findOpenedByTable = async () => null;

  await assert.rejects(
    () =>
      joinTableSessionService.execute({
        tableNumber: 12,
        tableToken: 'a'.repeat(32),
        restaurantSlug: 'restaurante-teste',
      }),
    /ainda não foi aberta pelo garçom/i,
  );
});

test('não retorna sessão quando pedidos por mesa estão desativados', async () => {
  resolvePublicTableService.execute = async () => ({
    ...resolvedTable,
    tableOrderingEnabled: false,
  });
  let queried = false;
  tableSessionRepository.findOpenedByTable = async () => {
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

  await tableSessionRepository.findOpenedByTable(91, fakeDb);

  assert.equal(query.where.tableId, 91);
  assert.equal(query.where.status, 'OPEN');
  assert.equal(query.where.OR[0].expiresAt, null);
  assert.ok(query.where.OR[1].expiresAt.gt instanceof Date);
  assert.equal(query.include.table.select.number, true);
  assert.equal('token' in query.include.table.select, false);
  assert.deepEqual(query.orderBy, { openedAt: 'desc' });
});

test('repositório de token nunca devolve sessão encerrada ou expirada', async () => {
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
  assert.equal(query.where.status, 'OPEN');
  assert.ok(query.where.OR[1].expiresAt.gt instanceof Date);
  assert.equal(query.include.table.select.restaurantId, true);
  assert.equal('token' in query.include.table.select, false);
});
