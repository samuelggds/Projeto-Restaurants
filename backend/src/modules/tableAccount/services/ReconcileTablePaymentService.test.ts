// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import tablePaymentRepository from '../repositories/TablePaymentRepository.js';
import { ReconcileTablePaymentService } from './ReconcileTablePaymentService.js';

const originalFindOwned = tablePaymentRepository.findOwnedByPublicId;

afterEach(() => {
  tablePaymentRepository.findOwnedByPublicId = originalFindOwned;
});

const now = new Date('2026-09-01T19:30:00.000Z');

function payment(overrides = {}) {
  return {
    id: 91,
    publicId: '423e4567-e89b-42d3-a456-426614174091',
    restaurantId: 7,
    tableSessionId: 55,
    payerParticipantId: 80,
    selectionMode: 'MY_ITEMS',
    method: 'PIX',
    status: 'PROCESSING',
    splitCount: null,
    idempotencyKeyHash: 'hash',
    requestFingerprint: 'fingerprint',
    subtotalCents: 3_000n,
    serviceFeeCents: 0n,
    totalCents: 3_000n,
    provider: 'FAKE_TABLE',
    providerExternalId: 'fake-table:payment-1',
    providerCheckoutUrl: null,
    providerPaymentCode: '000201FAKE',
    expiresAt: new Date('2026-09-01T19:40:00.000Z'),
    processingAt: now,
    paidAt: null,
    failedAt: null,
    canceledAt: null,
    refundedAt: null,
    failureCode: null,
    manualConfirmedById: null,
    manualConfirmedAt: null,
    createdAt: now,
    updatedAt: now,
    payerParticipant: { publicId: '123e4567-e89b-42d3-a456-426614174080' },
    tableSession: { publicId: '323e4567-e89b-42d3-a456-426614174055' },
    allocations: [],
    ...overrides,
  };
}

const context = {
  publicId: '423e4567-e89b-42d3-a456-426614174091',
  tableSessionId: 55,
  sessionPublicId: '323e4567-e89b-42d3-a456-426614174055',
  restaurantId: 7,
  participantId: 80,
};

test('consulta o provedor e aplica somente a transição canônica do pagamento pertencente ao cliente', async () => {
  const current = payment();
  const paid = payment({ status: 'PAID', paidAt: now });
  let reads = 0;
  tablePaymentRepository.findOwnedByPublicId = async (...args) => {
    assert.deepEqual(args.slice(0, 4), [current.publicId, 7, 55, 80]);
    reads += 1;
    return reads === 1 ? current : paid;
  };
  const provider = {
    code: 'FAKE_TABLE',
    getPayment: async (externalId) => {
      assert.equal(externalId, current.providerExternalId);
      return {
        externalId,
        status: 'PAID',
        amountCents: 3_000,
        checkoutUrl: null,
        paymentCode: '000201FAKE',
        expiresAt: current.expiresAt,
      };
    },
  };
  let validatedEvent;
  const processor = {
    executeValidated: async (event) => {
      validatedEvent = event;
      return { processed: true };
    },
  };

  const result = await new ReconcileTablePaymentService(provider, processor, () => now).execute(
    context,
  );

  assert.equal(validatedEvent.externalId, current.providerExternalId);
  assert.equal(validatedEvent.status, 'PAID');
  assert.equal(validatedEvent.amountCents, 3_000);
  assert.equal(result.payment.status, 'PAID');
});

test('rejeita divergência do provedor sem encaminhar qualquer transição', async () => {
  const current = payment();
  tablePaymentRepository.findOwnedByPublicId = async () => current;
  const provider = {
    code: 'FAKE_TABLE',
    getPayment: async () => ({
      externalId: current.providerExternalId,
      status: 'PAID',
      amountCents: 1,
      checkoutUrl: null,
      paymentCode: null,
      expiresAt: current.expiresAt,
    }),
  };
  let processed = false;
  const processor = {
    executeValidated: async () => {
      processed = true;
    },
  };

  await assert.rejects(
    () => new ReconcileTablePaymentService(provider, processor, () => now).execute(context),
    (error) => error.code === 'PROVIDER_AMOUNT_MISMATCH' && error.statusCode === 409,
  );
  assert.equal(processed, false);
});

test('não revela pagamento de outra participação nem consulta o provedor', async () => {
  tablePaymentRepository.findOwnedByPublicId = async () => null;
  let providerRead = false;
  const provider = {
    code: 'FAKE_TABLE',
    getPayment: async () => {
      providerRead = true;
    },
  };

  await assert.rejects(
    () => new ReconcileTablePaymentService(provider, {}, () => now).execute(context),
    (error) => error.code === 'TABLE_PAYMENT_NOT_FOUND' && error.statusCode === 404,
  );
  assert.equal(providerRead, false);
});
