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

const now = new Date('2026-10-01T18:00:00.000Z');
const adminActor = { id: 31, role: 'ADMIN', subRole: null, restaurantId: 7 };
const waiterActor = { id: 41, role: 'FUNCIONARIO', subRole: 'GARCOM', restaurantId: 7 };
const attendantActor = { id: 42, role: 'FUNCIONARIO', subRole: 'ATENDENTE', restaurantId: 7 };

function payment(overrides = {}) {
  return {
    id: 91,
    publicId: '423e4567-e89b-42d3-a456-426614174091',
    restaurantId: 7,
    tableSessionId: 55,
    payerParticipantId: 80,
    selectionMode: 'MY_ITEMS',
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
    providerChargeId: null,
    providerCheckoutUrl: null,
    providerPaymentCode: null,
    expiresAt: new Date('2026-10-01T18:10:00.000Z'),
    processingAt: null,
    paidAt: null,
    failedAt: null,
    canceledAt: null,
    refundedAt: null,
    failureCode: null,
    manualConfirmedById: null,
    manualConfirmedAt: null,
    createdAt: new Date('2026-10-01T17:59:00.000Z'),
    updatedAt: new Date('2026-10-01T17:59:00.000Z'),
    payerParticipant: { publicId: '123e4567-e89b-42d3-a456-426614174080' },
    tableSession: { publicId: '323e4567-e89b-42d3-a456-426614174055' },
    allocations: [],
    ...overrides,
  };
}

function installTransaction(currentPayment, options = {}) {
  let updateData;
  let createdEvent;
  const paidPayment = payment({
    ...currentPayment,
    status: 'PAID',
    paidAt: now,
    manualConfirmedAt: now,
    manualConfirmedById: adminActor.id,
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
      findUniqueOrThrow: async () => (options.staffOnly ? currentPayment : paidPayment),
    },
    tablePaymentEvent: {
      findUnique: async () => options.existingStaffReceipt ? { id: 1 } : null,
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
    get updateData() { return updateData; },
    get createdEvent() { return createdEvent; },
  };
}

test('admin é a autoridade final e transforma dinheiro em PAID', async () => {
  const current = payment();
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current);
  waiterCompensationProjectionService.project = async () => ({ created: false, reason: 'SESSION_NOT_CLOSED' });
  let realtimePayload;
  tableAccountEvents.updated = async (payload) => {
    realtimePayload = payload;
    return true;
  };

  const result = await new ConfirmManualTablePaymentService(() => now).execute({
    publicId: current.publicId,
    actor: adminActor,
  });

  assert.equal(transaction.updateData.status, 'PAID');
  assert.equal(transaction.updateData.manualConfirmedById, adminActor.id);
  assert.equal(transaction.createdEvent.metadata.stage, 'ADMIN_CONFIRMED');
  assert.equal(result.payment.status, 'PAID');
  assert.equal(result.confirmationStage, 'PAID');
  assert.equal(realtimePayload.reason, 'PAYMENT_CONFIRMED_MANUALLY');
});

test('garçom registra dinheiro recebido sem transformar o pagamento em PAID', async () => {
  const current = payment();
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current, { staffOnly: true });
  let realtimePayload;
  tableAccountEvents.updated = async (payload) => {
    realtimePayload = payload;
    return true;
  };

  const result = await new ConfirmManualTablePaymentService(() => now).execute({
    publicId: current.publicId,
    actor: waiterActor,
  });

  assert.equal(transaction.updateData, undefined);
  assert.equal(transaction.createdEvent.metadata.stage, 'STAFF_RECEIVED');
  assert.equal(transaction.createdEvent.toStatus, 'RESERVED');
  assert.equal(result.payment.status, 'RESERVED');
  assert.equal(result.confirmationStage, 'AWAITING_ADMIN');
  assert.equal(realtimePayload.reason, 'CASH_RECEIVED_BY_STAFF');
});

test('atendente possui a mesma permissão operacional do garçom, sem autoridade para marcar PAID', async () => {
  const current = payment();
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current, { staffOnly: true });
  tableAccountEvents.updated = async () => true;

  const result = await new ConfirmManualTablePaymentService(() => now).execute({
    publicId: current.publicId,
    actor: attendantActor,
  });

  assert.equal(transaction.updateData, undefined);
  assert.equal(transaction.createdEvent.metadata.stage, 'STAFF_RECEIVED');
  assert.equal(result.payment.status, 'RESERVED');
  assert.equal(result.confirmationStage, 'AWAITING_ADMIN');
});

test('registro repetido da equipe é idempotente e continua aguardando admin', async () => {
  const current = payment();
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current, { staffOnly: true, existingStaffReceipt: true });
  tableAccountEvents.updated = async () => true;

  const result = await new ConfirmManualTablePaymentService(() => now).execute({
    publicId: current.publicId,
    actor: waiterActor,
  });

  assert.equal(transaction.createdEvent, undefined);
  assert.equal(transaction.updateData, undefined);
  assert.equal(result.confirmationStage, 'AWAITING_ADMIN');
});

test('Pix nunca pode ser confirmado manualmente por funcionário ou admin', async () => {
  const current = payment({
    method: 'PIX',
    provider: 'MERCADO_PAGO',
    providerExternalId: 'pix_123',
  });
  tablePaymentRepository.findForStaffByPublicId = async () => current;
  const transaction = installTransaction(current);

  await assert.rejects(
    () =>
      new ConfirmManualTablePaymentService(() => now).execute({
        publicId: current.publicId,
        actor: adminActor,
      }),
    (error) => error.code === 'NOT_A_CASH_PAYMENT' && error.statusCode === 409,
  );
  assert.equal(transaction.updateData, undefined);
});
