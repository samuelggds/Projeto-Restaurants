// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { Prisma, TablePaymentIntentStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import { ForceCloseTableSessionService } from './ForceCloseTableSessionService.js';

const originals = {
  transaction: prisma.$transaction,
  findSession: tableSessionRepository.findById,
  forceClose: tableSessionRepository.forceClose,
  revokeParticipants: tableParticipantRepository.revokeActiveBySession,
  listCalls: tableServiceCallRepository.listActiveBySession,
  resolveCalls: tableServiceCallRepository.resolveActiveBySession,
  findCall: tableServiceCallRepository.findByIdForRestaurant,
  callUpdated: tableServiceCallEvents.updated,
  sessionClosed: tableSessionEvents.closed,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  tableSessionRepository.findById = originals.findSession;
  tableSessionRepository.forceClose = originals.forceClose;
  tableParticipantRepository.revokeActiveBySession = originals.revokeParticipants;
  tableServiceCallRepository.listActiveBySession = originals.listCalls;
  tableServiceCallRepository.resolveActiveBySession = originals.resolveCalls;
  tableServiceCallRepository.findByIdForRestaurant = originals.findCall;
  tableServiceCallEvents.updated = originals.callUpdated;
  tableSessionEvents.closed = originals.sessionClosed;
});

const openSession = {
  id: 55,
  publicId: '123e4567-e89b-42d3-a456-426614174055',
  tableId: 91,
  status: 'OPEN',
  openedAt: new Date('2026-08-26T12:00:00.000Z'),
  table: { id: 91, number: 12, restaurantId: 7 },
};

test('fechamento forçado registra motivo e cancela reservas financeiras ativas', async () => {
  const paymentUpdates = [];
  const paymentEvents = [];
  const tx = {
    $queryRaw: async () => [],
    tablePaymentIntent: {
      findMany: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.tableSessionId, 55);
        assert.deepEqual(where.status.in, [
          TablePaymentIntentStatus.RESERVED,
          TablePaymentIntentStatus.PROCESSING,
        ]);
        return [
          {
            id: 20,
            publicId: '223e4567-e89b-42d3-a456-426614174020',
            status: TablePaymentIntentStatus.RESERVED,
            totalCents: 2_500n,
          },
        ];
      },
      updateMany: async (args) => {
        paymentUpdates.push(args);
        return { count: 1 };
      },
    },
    tablePaymentEvent: {
      create: async ({ data }) => {
        paymentEvents.push(data);
        return data;
      },
    },
    tableBillItem: { findMany: async () => [] },
    order: { findMany: async () => [] },
  };
  prisma.$transaction = async (callback, options) => {
    assert.equal(options.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback(tx);
  };
  tableSessionRepository.findById = async () => openSession;
  tableServiceCallRepository.listActiveBySession = async () => [];
  tableParticipantRepository.revokeActiveBySession = async (sessionId, restaurantId) => {
    assert.deepEqual([sessionId, restaurantId], [55, 7]);
    return { count: 2 };
  };
  let forceCloseInput;
  const closedAt = new Date('2026-08-26T13:00:00.000Z');
  tableSessionRepository.forceClose = async (sessionId, actorId, reason) => {
    forceCloseInput = { sessionId, actorId, reason };
    return {
      id: 55,
      tableId: 91,
      status: 'CLOSED',
      openedAt: openSession.openedAt,
      closedAt,
      closedById: 3,
      forcedClosed: true,
      forceCloseReason: reason,
    };
  };
  let emittedSession;
  tableSessionEvents.closed = async (payload) => {
    emittedSession = payload;
  };

  const result = await new ForceCloseTableSessionService().execute({
    sessionId: 55,
    actorUserId: 3,
    restaurantId: 7,
    reason: 'Fechamento autorizado pelo gerente',
  });

  assert.deepEqual(forceCloseInput, {
    sessionId: 55,
    actorId: 3,
    reason: 'Fechamento autorizado pelo gerente',
  });
  assert.equal(paymentUpdates.length, 1);
  assert.equal(paymentUpdates[0].where.restaurantId, 7);
  assert.equal(paymentUpdates[0].data.status, TablePaymentIntentStatus.CANCELED);
  assert.equal(paymentEvents.length, 1);
  assert.equal(paymentEvents[0].actorUserId, 3);
  assert.deepEqual(paymentEvents[0].metadata, {
    reason: 'Fechamento autorizado pelo gerente',
    action: 'FORCE_CLOSE',
  });
  assert.equal(result.forcedClosed, true);
  assert.equal(emittedSession.restaurantId, 7);
  assert.equal(emittedSession.tableNumber, 12);
});

test('fechamento forçado não atravessa o tenant do administrador', async () => {
  let searchedPayments = false;
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [],
      tablePaymentIntent: {
        findMany: async () => {
          searchedPayments = true;
          return [];
        },
      },
    });
  tableSessionRepository.findById = async () => ({
    ...openSession,
    table: { ...openSession.table, restaurantId: 8 },
  });

  await assert.rejects(
    () =>
      new ForceCloseTableSessionService().execute({
        sessionId: 55,
        actorUserId: 3,
        restaurantId: 7,
        reason: 'Tentativa de outro restaurante',
      }),
    /não encontrada neste restaurante/i,
  );
  assert.equal(searchedPayments, false);
});
