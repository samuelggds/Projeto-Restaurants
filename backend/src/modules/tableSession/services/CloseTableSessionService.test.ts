// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import closeTableSessionService from './CloseTableSessionService.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import waiterCompensationProjectionService from '../../employeeCompensation/services/WaiterCompensationProjectionService.js';
import tableAccessRequestService from './TableAccessRequestService.js';

const originals = {
  transaction: prisma.$transaction,
  findById: tableSessionRepository.findById,
  close: tableSessionRepository.close,
  listCalls: tableServiceCallRepository.listActiveBySession,
  resolveCalls: tableServiceCallRepository.resolveActiveBySession,
  closedEvent: tableSessionEvents.closed,
  revokeParticipants: tableParticipantRepository.revokeActiveBySession,
  findOperationalBlocking: tableSessionRepository.findOperationalBlockingOrdersForSession,
  projectCompensation: waiterCompensationProjectionService.project,
  expireAccessRequests: tableAccessRequestService.expireForSession,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  tableSessionRepository.findById = originals.findById;
  tableSessionRepository.close = originals.close;
  tableServiceCallRepository.listActiveBySession = originals.listCalls;
  tableServiceCallRepository.resolveActiveBySession = originals.resolveCalls;
  tableSessionEvents.closed = originals.closedEvent;
  tableParticipantRepository.revokeActiveBySession = originals.revokeParticipants;
  tableSessionRepository.findOperationalBlockingOrdersForSession = originals.findOperationalBlocking;
  waiterCompensationProjectionService.project = originals.projectCompensation;
  tableAccessRequestService.expireForSession = originals.expireAccessRequests;
});

const openSession = {
  id: 55,
  tableId: 91,
  status: 'OPEN',
  openedAt: new Date('2026-10-01T12:00:00.000Z'),
  table: { id: 91, number: 12, restaurantId: 7 },
};

function mockTransaction({ ledgerItems = [] } = {}) {
  const transaction = {
    $queryRaw: async () => [{ lockAcquired: 1 }],
    tablePaymentIntent: { findMany: async () => [] },
    tableBillItem: { findMany: async () => ledgerItems },
    order: { findMany: async () => [] },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  waiterCompensationProjectionService.project = async () => ({
    created: false,
    reason: 'NO_VARIABLE_POLICY',
  });
  tableAccessRequestService.expireForSession = async () => undefined;
  return transaction;
}

test('isola o fechamento pelo restaurantId do funcionário', async () => {
  mockTransaction();
  tableSessionRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 7);
    return null;
  };
  let searchedOrders = false;
  tableSessionRepository.findOperationalBlockingOrdersForSession = async () => {
    searchedOrders = true;
    return [];
  };

  await assert.rejects(
    () => closeTableSessionService.execute({ sessionId: 55, restaurantId: 7, closedById: 3 }),
    /não encontrada neste restaurante/i,
  );
  assert.equal(searchedOrders, false);
});

test('bloqueia fechamento enquanto existe pedido MESA aguardando entrega', async () => {
  mockTransaction();
  tableSessionRepository.findById = async () => openSession;
  tableSessionRepository.findOperationalBlockingOrdersForSession = async (tableSessionId, restaurantId) => {
    assert.equal(tableSessionId, 55);
    assert.equal(restaurantId, 7);
    return [{ id: 101, status: 'PRONTO', paid: true }];
  };

  await assert.rejects(
    () => closeTableSessionService.execute({ sessionId: 55, restaurantId: 7, closedById: 3 }),
    /pedidos aguardando entrega.*#101/i,
  );
});

test('bloqueia fechamento quando a conta geral ainda possui saldo pendente', async () => {
  mockTransaction({
    ledgerItems: [
      {
        id: 1,
        publicId: 'item-pendente',
        participantId: 80,
        orderId: 101,
        unitPriceCents: 3_000n,
        financialStatus: 'UNPAID',
        canceledAt: null,
        createdAt: new Date('2026-10-01T12:10:00.000Z'),
        order: { status: 'ENTREGUE' },
        paymentAllocations: [],
      },
    ],
  });
  tableSessionRepository.findById = async () => openSession;
  tableSessionRepository.findOperationalBlockingOrdersForSession = async () => [];

  await assert.rejects(
    () => closeTableSessionService.execute({ sessionId: 55, restaurantId: 7, closedById: 3 }),
    /conta geral ainda possui pagamentos pendentes/i,
  );
});

test('fecha a mesa somente quando operação e conta geral estão quitadas', async () => {
  const transaction = mockTransaction();
  tableSessionRepository.findById = async () => openSession;
  tableSessionRepository.findOperationalBlockingOrdersForSession = async () => [];
  tableServiceCallRepository.listActiveBySession = async () => [];
  tableParticipantRepository.revokeActiveBySession = async () => ({ count: 2 });
  tableSessionRepository.close = async (id, restaurantId, closedById) => ({
    id: Number(id),
    tableId: 91,
    status: 'CLOSED',
    openedAt: openSession.openedAt,
    closedAt: new Date('2026-10-01T13:00:00.000Z'),
    closedById,
  });
  let projectionPayload;
  waiterCompensationProjectionService.project = async (payload) => {
    projectionPayload = payload;
    return { created: false, reason: 'NO_VARIABLE_POLICY' };
  };
  let eventPayload;
  tableSessionEvents.closed = async (payload) => {
    eventPayload = payload;
  };

  const result = await closeTableSessionService.execute({
    sessionId: 55,
    restaurantId: 7,
    closedById: 3,
  });

  assert.equal(result.status, 'CLOSED');
  assert.equal(eventPayload.restaurantId, 7);
  assert.equal(eventPayload.tableId, 91);
  assert.deepEqual(projectionPayload, {
    db: transaction,
    restaurantId: 7,
    tableSessionId: 55,
    now: new Date('2026-10-01T13:00:00.000Z'),
  });
});

test('consulta operacional mantém isolamento por restaurante, sessão e canal MESA', async () => {
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
  assert.deepEqual(query.where.status.notIn, ['CANCELADO', 'ENTREGUE']);
});
