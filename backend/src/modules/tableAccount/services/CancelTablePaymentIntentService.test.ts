// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import tablePaymentRepository from '../repositories/TablePaymentRepository.js';
import { CancelTablePaymentIntentService } from './CancelTablePaymentIntentService.js';
import { staffCashReceiptDeduplicationKey } from './tablePaymentLedger.js';

const originals = {
  transaction: prisma.$transaction,
  findOwnedByPublicId: tablePaymentRepository.findOwnedByPublicId,
};

afterEach(() => {
  prisma.$transaction = originals.transaction;
  tablePaymentRepository.findOwnedByPublicId = originals.findOwnedByPublicId;
});

test('cliente não pode cancelar dinheiro que a equipe já recebeu', async () => {
  const intent = {
    id: 91,
    publicId: '423e4567-e89b-42d3-a456-426614174091',
    restaurantId: 7,
    tableSessionId: 55,
    payerParticipantId: 80,
    method: 'CASH',
    status: 'RESERVED',
  };
  tablePaymentRepository.findOwnedByPublicId = async (
    publicId,
    restaurantId,
    tableSessionId,
    participantId,
  ) => {
    assert.deepEqual(
      [publicId, restaurantId, tableSessionId, participantId],
      [intent.publicId, 7, 55, 80],
    );
    return intent;
  };

  let updateCalled = false;
  const tx = {
    $queryRaw: async () => [{ ok: 1 }],
    tablePaymentIntent: {
      findMany: async () => [],
      updateMany: async () => {
        updateCalled = true;
        return { count: 1 };
      },
    },
    tablePaymentEvent: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.tableSessionId, 55);
        assert.equal(where.paymentIntentId, intent.id);
        assert.equal(
          where.deduplicationKey,
          staffCashReceiptDeduplicationKey(intent.publicId),
        );
        return { id: 123 };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(tx);

  await assert.rejects(
    () =>
      new CancelTablePaymentIntentService(null, () => new Date('2026-10-02T12:00:00.000Z')).execute(
        {
          publicId: intent.publicId,
          tableSessionId: 55,
          sessionPublicId: '323e4567-e89b-42d3-a456-426614174055',
          restaurantId: 7,
          participantId: 80,
        },
      ),
    (error) =>
      error.code === 'TABLE_PAYMENT_ALREADY_RECEIVED' &&
      error.statusCode === 409,
  );

  assert.equal(updateCalled, false);
});
