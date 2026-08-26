// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tableRepository from '../../table/repositories/TableRepository.js';
import resolvePublicTableService from '../../table/services/ResolvePublicTableService.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import openTableSessionService from './OpenTableSessionService.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';

const originalFindByIdForRestaurant = tableRepository.findByIdForRestaurant;
const originalResolvePublicTable = resolvePublicTableService.execute;
const originalFindActive = tableSessionRepository.findActiveByTable;
const originalListExpired = tableSessionRepository.listExpiredOpenByTable;
const originalClose = tableSessionRepository.close;
const originalCreate = tableSessionRepository.create;
const originalResolveCalls = tableServiceCallRepository.resolveActiveBySession;
const originalListCalls = tableServiceCallRepository.listActiveBySession;
const originalFindCall = tableServiceCallRepository.findByIdForRestaurant;
const originalOpenedEvent = tableSessionEvents.opened;
const originalClosedEvent = tableSessionEvents.closed;
const originalCallUpdatedEvent = tableServiceCallEvents.updated;
const originalRevokeParticipants = tableParticipantRepository.revokeActiveBySession;

afterEach(() => {
  tableRepository.findByIdForRestaurant = originalFindByIdForRestaurant;
  resolvePublicTableService.execute = originalResolvePublicTable;
  tableSessionRepository.findActiveByTable = originalFindActive;
  tableSessionRepository.listExpiredOpenByTable = originalListExpired;
  tableSessionRepository.close = originalClose;
  tableSessionRepository.create = originalCreate;
  tableServiceCallRepository.resolveActiveBySession = originalResolveCalls;
  tableServiceCallRepository.listActiveBySession = originalListCalls;
  tableServiceCallRepository.findByIdForRestaurant = originalFindCall;
  tableSessionEvents.opened = originalOpenedEvent;
  tableSessionEvents.closed = originalClosedEvent;
  tableServiceCallEvents.updated = originalCallUpdatedEvent;
  tableParticipantRepository.revokeActiveBySession = originalRevokeParticipants;
});

test('abre mesa sem gerar ou expor PIN e retorna somente dados seguros da sessão', async () => {
  const table = {
    id: 91,
    number: 12,
    restaurantId: 7,
    active: true,
    token: 'b'.repeat(32),
  };
  tableRepository.findByIdForRestaurant = async (tableId, restaurantId) => {
    assert.deepEqual([Number(tableId), Number(restaurantId)], [91, 7]);
    return table;
  };
  let resolvedPayload;
  resolvePublicTableService.execute = async (payload) => {
    resolvedPayload = payload;
    return {
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    };
  };
  tableSessionRepository.findActiveByTable = async () => null;
  tableSessionRepository.listExpiredOpenByTable = async () => [];
  let createData;
  tableSessionRepository.create = async (data) => {
    createData = data;
    return {
      id: 55,
      tableId: 91,
      status: 'OPEN',
      openedAt: new Date('2026-08-24T12:00:00.000Z'),
      expiresAt: data.expiresAt,
      pinHash: data.pinHash,
      sessionToken: data.sessionToken,
      table,
      openedBy: { id: 3, name: 'Alex', email: 'alex@example.com' },
    };
  };
  tableSessionEvents.opened = async () => {};

  const result = await openTableSessionService.execute({
    tableId: 91,
    restaurantId: 7,
    openedById: 3,
  });

  assert.deepEqual(resolvedPayload, {
    tableId: 91,
    tableNumber: 12,
    tableToken: table.token,
    restaurantId: 7,
  });
  assert.equal(createData.pinHash, 'PIN_FLOW_DISABLED');
  assert.equal(createData.restaurantId, 7);
  assert.match(createData.sessionToken, /^[a-f0-9]{64}$/);
  assert.equal(result.sessionId, 55);
  assert.equal('pin' in result, false);
  assert.equal('sessionToken' in result.session, false);
  assert.equal('pinHash' in result.session, false);
  assert.equal('token' in result.session.table, false);
  assert.equal('email' in result.session.openedBy, false);
});

test('não cria uma segunda sessão quando já existe uma OPEN não expirada', async () => {
  const table = {
    id: 91,
    number: 12,
    restaurantId: 7,
    active: true,
    token: 'b'.repeat(32),
  };
  tableRepository.findByIdForRestaurant = async () => table;
  resolvePublicTableService.execute = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    tableOrderingEnabled: true,
  });
  tableSessionRepository.findActiveByTable = async () => ({
    id: 54,
    tableId: 91,
    expiresAt: new Date(Date.now() + 60_000),
  });
  let listedExpired = false;
  tableSessionRepository.listExpiredOpenByTable = async () => {
    listedExpired = true;
    return [];
  };
  let createCalled = false;
  tableSessionRepository.create = async () => {
    createCalled = true;
  };

  await assert.rejects(
    () => openTableSessionService.execute({ tableId: 91, restaurantId: 7, openedById: 3 }),
    /mesa já está aberta/i,
  );
  assert.equal(listedExpired, false);
  assert.equal(createCalled, false);
});

test('encerra todas as sessões OPEN expiradas e avisa os clientes antes de abrir uma nova', async () => {
  const table = {
    id: 91,
    number: 12,
    restaurantId: 7,
    active: true,
    token: 'c'.repeat(32),
  };
  tableRepository.findByIdForRestaurant = async () => table;
  resolvePublicTableService.execute = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
    tableOrderingEnabled: true,
    waiterCallEnabled: true,
    billRequestEnabled: true,
  });
  tableSessionRepository.findActiveByTable = async () => null;
  tableSessionRepository.listExpiredOpenByTable = async () => [
    {
      id: 54,
      tableId: 91,
      expiresAt: new Date(Date.now() - 1_000),
      table,
    },
    {
      id: 53,
      tableId: 91,
      expiresAt: new Date(Date.now() - 2_000),
      table,
    },
  ];
  const closedIds = [];
  tableSessionRepository.close = async (id) => {
    closedIds.push(Number(id));
    return { closedAt: new Date() };
  };
  tableParticipantRepository.revokeActiveBySession = async () => ({ count: 0 });
  const resolvedSessionIds = [];
  tableServiceCallRepository.listActiveBySession = async (sessionId) => [
    { id: Number(sessionId) + 1000 },
  ];
  tableServiceCallRepository.resolveActiveBySession = async (sessionId) => {
    resolvedSessionIds.push(Number(sessionId));
    return { count: 0 };
  };
  tableServiceCallRepository.findByIdForRestaurant = async (id) => ({
    id,
    restaurantId: 7,
    tableId: 91,
    type: 'WAITER',
    status: 'RESOLVED',
  });
  tableSessionRepository.create = async (data) => ({
    id: 55,
    ...data,
    status: 'OPEN',
    openedAt: new Date(),
    table,
    openedBy: { id: 3, name: 'Alex' },
  });
  const realtimeSequence = [];
  tableSessionEvents.closed = async (payload) => {
    realtimeSequence.push(`closed:${payload.sessionId}:${payload.reason}`);
  };
  tableSessionEvents.opened = async (payload) => {
    realtimeSequence.push(`opened:${payload.sessionId}`);
  };
  tableServiceCallEvents.updated = async (payload) => {
    realtimeSequence.push(`call:${payload.id}:${payload.status}`);
  };

  const result = await openTableSessionService.execute({
    tableId: 91,
    restaurantId: 7,
    openedById: 3,
  });

  assert.deepEqual(closedIds, [54, 53]);
  assert.deepEqual(resolvedSessionIds, [54, 53]);
  assert.equal(result.sessionId, 55);
  assert.deepEqual(realtimeSequence, [
    'closed:54:expired',
    'call:1054:RESOLVED',
    'closed:53:expired',
    'call:1053:RESOLVED',
    'opened:55',
  ]);
});

test('falha de realtime ao avisar expiração não impede a nova abertura', async () => {
  const table = {
    id: 91,
    number: 12,
    restaurantId: 7,
    active: true,
    token: 'd'.repeat(32),
  };
  tableRepository.findByIdForRestaurant = async () => table;
  resolvePublicTableService.execute = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    tableOrderingEnabled: true,
  });
  tableSessionRepository.findActiveByTable = async () => null;
  tableSessionRepository.listExpiredOpenByTable = async () => [
    { id: 54, tableId: 91, table, expiresAt: new Date(Date.now() - 1_000) },
  ];
  tableServiceCallRepository.listActiveBySession = async () => [];
  tableSessionRepository.close = async () => ({ closedAt: new Date() });
  tableParticipantRepository.revokeActiveBySession = async () => ({ count: 0 });
  tableServiceCallRepository.resolveActiveBySession = async () => ({ count: 0 });
  tableSessionEvents.closed = async () => {
    throw new Error('socket indisponível');
  };
  tableSessionRepository.create = async (data) => ({
    id: 55,
    ...data,
    status: 'OPEN',
    openedAt: new Date(),
    table,
    openedBy: { id: 3, name: 'Alex' },
  });
  tableSessionEvents.opened = async () => {};
  const originalConsoleError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);

  try {
    const result = await openTableSessionService.execute({
      tableId: 91,
      restaurantId: 7,
      openedById: 3,
    });
    assert.equal(result.sessionId, 55);
    assert.equal(
      logs.some((entry) => entry[0] === '[TABLE_SESSION_REALTIME_ERROR]'),
      true,
    );
  } finally {
    console.error = originalConsoleError;
  }
});

test('não abre mesa quando o administrador desativou pedidos pelo cardápio de mesa', async () => {
  tableRepository.findByIdForRestaurant = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    active: true,
    token: 'a'.repeat(32),
  });
  resolvePublicTableService.execute = async () => ({
    id: 91,
    number: 12,
    restaurantId: 7,
    restaurantSlug: 'restaurante-teste',
    tableOrderingEnabled: false,
    waiterCallEnabled: true,
    billRequestEnabled: true,
  });
  let searchedOpenSession = false;
  tableSessionRepository.findActiveByTable = async () => {
    searchedOpenSession = true;
    return null;
  };
  tableSessionRepository.listExpiredOpenByTable = async () => [];

  await assert.rejects(
    () =>
      openTableSessionService.execute({
        tableId: 91,
        restaurantId: 7,
        openedById: 3,
      }),
    /pedidos.*desativados/i,
  );
  assert.equal(searchedOpenSession, false);
});
