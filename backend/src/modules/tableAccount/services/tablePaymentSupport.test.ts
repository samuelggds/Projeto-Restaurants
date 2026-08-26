import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTablePaymentRequestFingerprint,
  serializeTablePaymentIntentForAdmin,
  sha256,
} from './tablePaymentSupport.js';

const basePayment = {
  selectionMode: 'SELECTED_ITEMS' as const,
  method: 'PIX' as const,
  billItemPublicIds: [
    '7f2332e6-771e-4320-b3cc-5e974547f50f',
    '1dbdc220-280e-4a2b-b4ed-a2dd0d27013a',
  ],
  includeOptionalServiceFee: false,
  idempotencyKey: 'idempotency-key-123',
};

test('persiste somente SHA-256 da chave de idempotência', () => {
  const raw = 'idempotency-key-123';
  const hash = sha256(raw);

  assert.equal(hash.length, 64);
  assert.notEqual(hash, raw);
  assert.equal(hash, sha256(raw));
});

test('fingerprint é estável para a mesma seleção e preso ao participante', () => {
  const first = buildTablePaymentRequestFingerprint(10, basePayment);
  const reordered = buildTablePaymentRequestFingerprint(10, {
    ...basePayment,
    billItemPublicIds: [...basePayment.billItemPublicIds].reverse(),
  });
  const anotherParticipant = buildTablePaymentRequestFingerprint(11, basePayment);

  assert.equal(first, reordered);
  assert.notEqual(first, anotherParticipant);
});

test('histórico administrativo expõe auditoria útil sem devolver metadados arbitrários', () => {
  const now = new Date('2026-08-26T14:00:00.000Z');
  const result = serializeTablePaymentIntentForAdmin(
    {
      id: 1,
      publicId: 'b3f62ce9-dff2-4894-baf3-7c8e3d56011e',
      restaurantId: 7,
      tableSessionId: 9,
      payerParticipantId: 11,
      selectionMode: 'FULL_ACCOUNT',
      method: 'PIX',
      status: 'REFUNDED',
      splitCount: null,
      idempotencyKeyHash: 'hash',
      requestFingerprint: 'fingerprint',
      subtotalCents: 1_500n,
      serviceFeeCents: 0n,
      totalCents: 1_500n,
      provider: 'FAKE_TABLE',
      providerExternalId: 'fake-table:payment',
      providerCheckoutUrl: null,
      expiresAt: now,
      processingAt: now,
      paidAt: now,
      failedAt: null,
      canceledAt: null,
      refundedAt: now,
      failureCode: null,
      manualConfirmedById: null,
      manualConfirmedAt: null,
      createdAt: now,
      updatedAt: now,
      payerParticipant: { publicId: '207c6458-48db-41b4-bca9-709c8b2ddb49' },
      tableSession: { publicId: 'af6c74a7-469a-47e0-a503-2ee4e8a0fa2b' },
      allocations: [],
      manualConfirmedBy: null,
      events: [
        {
          type: 'REFUNDED',
          fromStatus: 'PAID',
          toStatus: 'REFUNDED',
          provider: 'FAKE_TABLE',
          providerEventId: null,
          amountCents: 1_500n,
          metadata: { reason: 'Cliente solicitou o estorno.', providerSecret: 'não-vazar' },
          occurredAt: now,
          actorUser: { name: 'Administrador' },
        },
      ],
    },
    'af6c74a7-469a-47e0-a503-2ee4e8a0fa2b',
  );

  assert.equal(result.events[0]?.reason, 'Cliente solicitou o estorno.');
  assert.equal(result.events[0]?.actorName, 'Administrador');
  assert.doesNotMatch(JSON.stringify(result), /providerSecret|não-vazar/);
});
