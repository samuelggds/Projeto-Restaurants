// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import tableServiceCallRepository from '../../waiterCalls/repositories/TableServiceCallRepository.js';
import { tableServiceCallEvents } from '../../waiterCalls/realtime/tableServiceCallEvents.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableSessionRepository from '../repositories/TableSessionRepository.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';
import { ForceCloseTableSessionService } from './ForceCloseTableSessionService.js';
import waiterCompensationProjectionService from '../../employeeCompensation/services/WaiterCompensationProjectionService.js';

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
  projectCompensation: waiterCompensationProjectionService.project,
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
  waiterCompensationProjectionService.project = originals.projectCompensation;
});

const openSession = {
  id: 55,
  publicId: '123e4567-e89b-42d3-a456-426614174055',
  tableId: 91,
  status: 'OPEN',
  openedAt: new Date('2026-10-01T12:00:00.000Z'),
  table: { id: 91, number: 12, restaurantId: 7 },
};

function transactionWithLedger(ledgerItems = []) {
  const tx = {
    $queryRaw: async () => [],
    tablePaymentIntent: {
      findMany: async () => [],
    },
    tableBillItem: {
      findMany: async () => ledgerItems,
    },
    order: {
      findMany: async () => [],
    },
  };
  prisma.$transaction = async (callback, options) => {
    assert.equal(options.isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
    return callback(tx);
  };
  return tx;
}

test('fechamento administrativo nunca ignora saldo pendente da conta geral', async () => {
  transactionWithLedger([
    {
      id: 1,
      publicId: 'item-pendente',
      participantId: 80,
      orderId: 101,
      unitPriceCents: 2_500n,
      financialStatus: 'UNPAID',
      canceledAt: null,
      createdAt: new Date('2026-10-01T12:10:00.000Z'),
      order: { status: 'ENTREGUE' },
      paymentAllocations: [],
    },
  ]);
  tableSessionRepository.findById = async () => openSession;
  let forceCloseCalled = false;
  tableSessionRepository.forceClose = async () => {
    forceCloseCalled = true;
    throw new Error('não deveria fechar');
  };

  await assert.rejects(
    () =>
      new ForceCloseTableSessionService().execute({
        sessionId: 55,
        actorUserId: 3,
        restaurantId: 7,
        reason: 'Correção operacional da sessão',
      }),
    /conta geral ainda possui pagamentos pendentes/i,
  );

  assert.equal(forceCloseCalled, false);
});

test('reserva ou pagamento em processamento também bloqueia fechamento administrativo', async () => {
  transactionWithLedger([
    {
      id: 1,
      publicId: 'item-reservado',
      participantId: 80,
      orderId: 101,
      unitPriceCents: 2_500n,
      financialStatus: 'RESERVED',
      canceledAt: null,
      createdAt: new Date('2026-10-01T12:10:00.000Z'),
      order: { status: 'ENTREGUE' },
      paymentAllocations: [
        {
          amountCents: 2_500n,
          paymentIntent: {
            status: 'RESERVED',
            expiresAt: new Date('2099-01-01T00:10:00.000Z'),
          },
        },
      ],
    },
  ]);
  tableSessionRepository.findById = async () => openSession;

  await assert.rejects(
    () =>
      new ForceCloseTableSessionService().execute({
        sessionId: 55,
        actorUserId: 3,
        restaurantId: 7,
        reason: 'Correção operacional da sessão',
      }),
    /conta geral ainda possui pagamentos pendentes/i,
  );
});

test('fechamento administrativo continua disponível para exceção operacional após quitação', async () => {
  const tx = transactionWithLedger([]);
  tableSessionRepository.findById = async () => openSession;
  tableServiceCallRepository.listActiveBySession = async () => [];
  tableParticipantRepository.revokeActiveBySession = async (sessionId, restaurantId) => {
    assert.deepEqual([sessionId, restaurantId], [55, 7]);
    return { count: 2 };
  };
  waiterCompensationProjectionService.project = async (payload) => {
    assert.equal(payload.db, tx);
    assert.equal(payload.restaurantId, 7);
    assert.equal(payload.tableSessionId, 55);
    return { created: false, reason: 'NO_VARIABLE_POLICY' };
  };

  let forceCloseInput;
  const closedAt = new Date('2026-10-01T13:00:00.000Z');
  tableSessionRepository.forceClose = async (sessionId, restaurantId, actorId, reason) => {
    forceCloseInput = { sessionId, restaurantId, actorId, reason };
    return {
      id: 55,
      tableId: 91,
      status: 'CLOSED',
      openedAt: openSession.openedAt,
      closedAt,
      closedById: actorId,
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
    reason: 'Correção operacional da sessão',
  });

  assert.deepEqual(forceCloseInput, {
    sessionId: 55,
    restaurantId: 7,
    actorId: 3,
    reason: 'Correção operacional da sessão',
  });
  assert.equal(result.forcedClosed, true);
  assert.equal(emittedSession.restaurantId, 7);
  assert.equal(emittedSession.tableNumber, 12);
});

test('fechamento administrativo não atravessa o tenant do administrador', async () => {
  let ledgerRead = false;
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [],
      tablePaymentIntent: {
        findMany: async () => [],
      },
      tableBillItem: {
        findMany: async () => {
          ledgerRead = true;
          return [];
        },
      },
    });
  tableSessionRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 7);
    return null;
  };

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
  assert.equal(ledgerRead, false);
});
