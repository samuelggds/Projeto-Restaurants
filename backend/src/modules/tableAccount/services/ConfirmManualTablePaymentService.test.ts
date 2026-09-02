// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';
import tablePaymentRepository from '../repositories/TablePaymentRepository.js';
import { ConfirmManualTablePaymentService } from './ConfirmManualTablePaymentService.js';
import waiterCompensationProjectionService from '../../employeeCompensation/services/WaiterCompensationProjectionService.js';

const originals = {
  transaction: prisma.$transaction,
  findForStaffByPublicId: tablePaymentRepository.findForStaffByPublicId,
  updatedEvent: tableAccountEvents.updated,
  projectCompensation: waiterCompensationProjectionService.project,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  tablePaymentRepository.findForStaffByPublicId = originals.findForStaffByPublicId;
  tableAccountEvents.updated = originals.updatedEvent;
  waiterCompensationProjectionService.project = originals.projectCompensation;
});

const now = new Date('2026-08-26T18:00:00.000Z');
const actor = {
  id: 31,
  role: 'FUNCIONARIO',
  subRole: 'GARCOM',
  restaurantId: 7,
};

function payment(overrides = {}) {
  return {
    id: 91,
    publicId: '423e4567-e89b-42d3-a456-426614174091',
    restaurantId: 7,
    tableSessionId: 55,
    payerParticipantId: 80,
    selectionMode: 'WAITER',
    method: 'CASH',
    status: 'RESERVED',
    splitCount: null,
    idempotencyKeyHash: 'hash',
    requestFingerprint: 'fingerprint',
    subtotalCents: 3_000n,
    serviceFeeCents: 0n,
    totalCents: 3_000n,
    provider: null,
    providerExternalId: null,
    providerCheckoutUrl: null,
    providerPaymentCode: null,
    expiresAt: new Date('2026-08-26T18:10:00.000Z'),
    processingAt: null,
    paidAt: null,
    failedAt: null,
    canceledAt: null,
    refundedAt: null,
    failureCode: null,
    manualConfirmedById: null,
    manualConfirmedAt: null,
    createdAt: new Date('2026-08-26T17:59:00.000Z'),
    updatedAt: new Date('2026-08-26T17:59:00.000Z'),
    payerParticipant: { publicId: '123e4567-e89b-42d3-a456-426614174080' },
    tableSession: { publicId: '323e4567-e89b-42d3-a456-426614174055' },
    allocations: [],
    ...overrides,
  };
}

function installTransaction(currentPayment) {
  let updateData;
  let createdEvent;
  const paidPayment = payment({
    ...currentPayment,
    status: 'PAID',
    paidAt: now,
    manualConfirmedAt: now,
    manualConfirmedById: actor.id,
    updatedAt: now,
  });
  const tx = {
    $queryRaw: async () => [{ lockAcquired: 1 }],
    tablePaymentIntent: {
      findMany: async () => [],
      updateMany: async ({ data }) => {
        updateData = data;
        return { count: 1 };
      },
      findUniqueOrThrow: async () => paidPayment,
    },
    tablePaymentEvent: {
      create: async ({ data }) => {
        createdEvent = data;
        return data;
      },
    },
    tableBillItem: { findMany: async () => [] },
    order: { findMany: async () => [] },
  };
  prisma.$transaction = async (callback) => callback(tx);
  return {
    tx,
    get updateData() {
      return updateData;
    },
    get createdEvent() {
      return createdEvent;
    },
  };
}

test('confirma dinheiro presencial e publica a atualização canônica da mesa', async () => {
  const current = payment();
  tablePaymentRepository.findForStaffByPublicId = async (publicId, restaurantId) => {
    assert.equal(publicId, current.publicId);
    assert.equal(restaurantId, 7);
    return current;
  };
  const transaction = installTransaction(current);
  let projectionPayload;
  waiterCompensationProjectionService.project = async (payload) => {
    projectionPayload = payload;
    return { created: false, reason: 'SESSION_NOT_CLOSED' };
  };
  let realtimePayload;
  tableAccountEvents.updated = async (payload) => {
    realtimePayload = payload;
    return true;
  };

  const result = await new ConfirmManualTablePaymentService(() => now).execute({
    publicId: current.publicId,
    actor,
  });

  assert.equal(transaction.updateData.status, 'PAID');
  assert.equal(transaction.updateData.manualConfirmedById, actor.id);
  assert.equal(transaction.createdEvent.type, 'MANUAL_CONFIRMED');
  assert.equal(result.payment.status, 'PAID');
  assert.deepEqual(projectionPayload, {
    db: transaction.tx,
    restaurantId: 7,
    tableSessionId: 55,
    now,
  });
  assert.deepEqual(realtimePayload, {
    sessionId: 55,
    restaurantId: 7,
    reason: 'PAYMENT_CONFIRMED_MANUALLY',
    paymentPublicId: current.publicId,
    paymentStatus: 'PAID',
    occurredAt: now,
  });
});

test('rejeita confirmação manual de Pix ou cartão online mesmo com registro adulterado', async () => {
  const current = payment({
    selectionMode: 'MY_ITEMS',
    method: 'PIX',
    provider: 'FAKE',
    providerExternalId: 'fake_123',
  });
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current);

  await assert.rejects(
    () =>
      new ConfirmManualTablePaymentService(() => now).execute({
        publicId: current.publicId,
        actor,
      }),
    (error) => error.code === 'NOT_A_MANUAL_PAYMENT' && error.statusCode === 409,
  );
  assert.equal(transaction.updateData, undefined);
});

test('repetição por outro funcionário retorna o pagamento já confirmado sem cobrar novamente', async () => {
  const confirmedAt = new Date('2026-08-26T17:58:00.000Z');
  const current = payment({
    status: 'PAID',
    paidAt: confirmedAt,
    manualConfirmedAt: confirmedAt,
    manualConfirmedById: 22,
  });
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current);
  tableAccountEvents.updated = async () => true;

  const result = await new ConfirmManualTablePaymentService(() => now).execute({
    publicId: current.publicId,
    actor,
  });

  assert.equal(result.payment.status, 'PAID');
  assert.equal(transaction.updateData, undefined);
  assert.equal(transaction.createdEvent, undefined);
});
