// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expireTablePaymentReservations,
  loadTablePaymentLedgerItems,
  STAFF_CASH_RECEIPT_EVENT_SUFFIX,
  staffCashReceiptDeduplicationKey,
} from './tablePaymentLedger.js';

const now = new Date('2026-10-02T12:00:00.000Z');

test('dinheiro já recebido pela equipe continua reservado mesmo após o timeout original', async () => {
  const db = {
    tableBillItem: {
      findMany: async () => [
        {
          id: 10,
          publicId: 'bill-item-10',
          participantId: 80,
          orderId: 20,
          unitPriceCents: 3_000n,
          financialStatus: 'RESERVED',
          canceledAt: null,
          createdAt: new Date('2026-10-02T11:00:00.000Z'),
          order: { status: 'PENDENTE' },
          paymentAllocations: [
            {
              amountCents: 3_000n,
              paymentIntent: {
                status: 'RESERVED',
                expiresAt: new Date('2026-10-02T11:10:00.000Z'),
                events: [
                  {
                    deduplicationKey: staffCashReceiptDeduplicationKey(
                      '423e4567-e89b-42d3-a456-426614174091',
                    ),
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };

  const [item] = await loadTablePaymentLedgerItems(db, 7, 55, now);

  assert.equal(item.reservedCents, 3_000);
  assert.equal(item.availableCents, 0);
  assert.equal(item.projectedStatus, 'RESERVED');
});

test('consulta de expiração exclui intenções que já têm recebimento da equipe', async () => {
  let where;
  const tx = {
    tablePaymentIntent: {
      findMany: async (args) => {
        where = args.where;
        return [];
      },
    },
  };

  const count = await expireTablePaymentReservations(tx, 7, 55, now);

  assert.equal(count, 0);
  assert.equal(where.restaurantId, 7);
  assert.equal(where.tableSessionId, 55);
  assert.equal(where.events.none.type, 'MANUAL_CONFIRMED');
  assert.equal(
    where.events.none.deduplicationKey.endsWith,
    STAFF_CASH_RECEIPT_EVENT_SUFFIX,
  );
});
