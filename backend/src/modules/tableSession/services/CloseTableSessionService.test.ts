// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import closeTableSessionService from './CloseTableSessionService.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableAccountSettingsRepository from '../../tableAccount/repositories/TableAccountSettingsRepository.js';

const originals = {
  transaction: prisma.$transaction,
  findById: tableSessionRepository.findById,
  findBlocking: tableSessionRepository.findBlockingOrdersForSession,
  close: tableSessionRepository.close,
  listCalls: tableServiceCallRepository.listActiveBySession,
  resolveCalls: tableServiceCallRepository.resolveActiveBySession,
  closedEvent: tableSessionEvents.closed,
  revokeParticipants: tableParticipantRepository.revokeActiveBySession,
  findAccountSettings: tableAccountSettingsRepository.findByRestaurantId,
  findOperationalBlocking: tableSessionRepository.findOperationalBlockingOrdersForSession,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  tableSessionRepository.findById = originals.findById;
  tableSessionRepository.findBlockingOrdersForSession = originals.findBlocking;
  tableSessionRepository.close = originals.close;
  tableServiceCallRepository.listActiveBySession = originals.listCalls;
  tableServiceCallRepository.resolveActiveBySession = originals.resolveCalls;
  tableSessionEvents.closed = originals.closedEvent;
  tableParticipantRepository.revokeActiveBySession = originals.revokeParticipants;
  tableAccountSettingsRepository.findByRestaurantId = originals.findAccountSettings;
  tableSessionRepository.findOperationalBlockingOrdersForSession =
    originals.findOperationalBlocking;
});

function mockTransaction() {
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async (query) => {
        assert.match(String(query.sql), /SELECT 1::int AS "lockAcquired"/i);
        assert.match(String(query.sql), /FROM pg_advisory_xact_lock/i);
        return [{ lockAcquired: 1 }];
      },
    });
  tableAccountSettingsRepository.findByRestaurantId = async () => ({
    preventCloseWithOutstandingBalance: true,
  });
}

const openSession = {
  id: 55,
  tableId: 91,
  status: 'OPEN',
  openedAt: new Date('2026-08-24T12:00:00.000Z'),
  table: { id: 91, number: 12, restaurantId: 7 },
};

test('isola o fechamento pelo restaurantId do token', async () => {
  mockTransaction();
  tableSessionRepository.findById = async () => ({
    ...openSession,
    table: { ...openSession.table, restaurantId: 8 },
  });
  let searchedOrders = false;
  tableSessionRepository.findBlockingOrdersForSession = async () => {
    searchedOrders = true;
    return [];
  };

  await assert.rejects(
    () => closeTableSessionService.execute({ sessionId: 55, restaurantId: 7, closedById: 3 }),
    /não encontrada neste restaurante/i,
  );
  assert.equal(searchedOrders, false);
});

test('bloqueia fechamento enquanto existe pedido ou pagamento pendente', async () => {
  mockTransaction();
  tableSessionRepository.findById = async () => openSession;
  tableSessionRepository.findBlockingOrdersForSession = async (tableSessionId, restaurantId) => {
    assert.equal(tableSessionId, 55);
    assert.equal(restaurantId, 7);
    return [
      { id: 101, status: 'PRONTO', paid: true },
      { id: 102, status: 'ENTREGUE', paid: false },
    ];
  };
  let closeCalled = false;
  tableSessionRepository.close = async () => {
    closeCalled = true;
  };

  await assert.rejects(
    () => closeTableSessionService.execute({ sessionId: 55, restaurantId: 7, closedById: 3 }),
    /pedidos aguardando entrega e pagamentos pendentes.*#101, #102/i,
  );
  assert.equal(closeCalled, false);
});

test('fecha a mesa e encerra chamados ativos após todos os pedidos pagos e entregues', async () => {
  mockTransaction();
  tableSessionRepository.findById = async () => openSession;
  tableSessionRepository.findBlockingOrdersForSession = async () => [];
  tableServiceCallRepository.listActiveBySession = async () => [];
  tableParticipantRepository.revokeActiveBySession = async () => ({ count: 2 });
  tableSessionRepository.close = async (id, closedById) => ({
    id: Number(id),
    tableId: 91,
    status: 'CLOSED',
    openedAt: openSession.openedAt,
    closedAt: new Date('2026-08-24T13:00:00.000Z'),
    closedById,
  });
  let eventPayload;
  tableSessionEvents.closed = async (payload) => {
    eventPayload = payload;
  };

  const result = await closeTableSessionService.execute({
    sessionId: 55,
    restaurantId: 7,
    closedById: 3,
  });

  assert.deepEqual(result, {
    id: 55,
    tableId: 91,
    status: 'CLOSED',
    openedAt: openSession.openedAt,
    closedAt: new Date('2026-08-24T13:00:00.000Z'),
    closedById: 3,
  });
  assert.equal(eventPayload.restaurantId, 7);
  assert.equal(eventPayload.tableId, 91);
  assert.equal(eventPayload.status, 'CLOSED');
});

test('consulta somente pedidos MESA vinculados exatamente à sessão e ao restaurante', async () => {
  let query;
  const fakeDb = {
    order: {
      findMany: async (args) => {
        query = args;
        return [];
      },
    },
  };
  await tableSessionRepository.findBlockingOrdersForSession(55, 7, fakeDb);

  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.tableSessionId, 55);
  assert.equal(query.where.type, 'MESA');
  assert.equal('tableId' in query.where, false);
  assert.equal('createdAt' in query.where, false);
  assert.equal(query.where.status.not, 'CANCELADO');
  assert.deepEqual(query.where.OR, [{ status: { not: 'ENTREGUE' } }, { paid: false }]);
});

test('consulta operacional também isola sessão, restaurante e canal MESA', async () => {
  let query;
  const fakeDb = {
    order: {
      findMany: async (args) => {
        query = args;
        return [];
      },
    },
  };

  await tableSessionRepository.findOperationalBlockingOrdersForSession(55, 7, fakeDb);

  assert.equal(query.where.restaurantId, 7);
  assert.equal(query.where.tableSessionId, 55);
  assert.equal(query.where.type, 'MESA');
  assert.equal('tableId' in query.where, false);
  assert.equal('createdAt' in query.where, false);
  assert.deepEqual(query.where.status.notIn, ['CANCELADO', 'ENTREGUE']);
});
