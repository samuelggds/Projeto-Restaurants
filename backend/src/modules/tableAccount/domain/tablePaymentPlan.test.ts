import assert from 'node:assert/strict';
import test from 'node:test';
import type { CreateTablePaymentIntentInput } from './tableAccountSchemas.js';
import { buildTablePaymentPlan, TablePaymentPlanError } from './tablePaymentPlan.js';

const baseItems = [
  {
    id: 1,
    publicId: 'item-a',
    participantId: 10,
    unitPriceCents: 50,
    paidCents: 0,
    reservedCents: 0,
    processingCents: 0,
    availableCents: 50,
    projectedStatus: 'UNPAID' as const,
    canceled: false,
  },
  {
    id: 2,
    publicId: 'item-b',
    participantId: 20,
    unitPriceCents: 51,
    paidCents: 0,
    reservedCents: 0,
    processingCents: 0,
    availableCents: 51,
    projectedStatus: 'UNPAID' as const,
    canceled: false,
  },
];

function payment(overrides: Partial<CreateTablePaymentIntentInput>): CreateTablePaymentIntentInput {
  return {
    selectionMode: 'FULL_ACCOUNT',
    method: 'PIX',
    includeOptionalServiceFee: false,
    idempotencyKey: 'chave-idempotente-123',
    ...overrides,
  };
}

test('paga somente os itens do participante sem confiar em IDs do cliente', () => {
  const plan = buildTablePaymentPlan({
    payment: payment({ selectionMode: 'MY_ITEMS' }),
    participantId: 10,
    items: baseItems,
  });

  assert.equal(plan.subtotalCents, 50);
  assert.deepEqual(plan.selectedItemPublicIds, ['item-a']);
});

test('divide 101 centavos em três e reserva exatamente a primeira parte', () => {
  const plan = buildTablePaymentPlan({
    payment: payment({ selectionMode: 'EQUAL_SPLIT', splitCount: 3 }),
    participantId: 10,
    items: baseItems,
  });

  assert.equal(plan.subtotalCents, 34);
  assert.equal(
    plan.allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0),
    34,
  );
});

test('dois clientes não conseguem reservar a mesma conta simultaneamente', () => {
  const reservedItems = [
    { ...baseItems[0], reservedCents: 50, availableCents: 0, projectedStatus: 'RESERVED' as const },
    baseItems[1],
  ];

  assert.throws(
    () =>
      buildTablePaymentPlan({
        payment: payment({ selectionMode: 'FULL_ACCOUNT' }),
        participantId: 20,
        items: reservedItems,
      }),
    (error: unknown) =>
      error instanceof TablePaymentPlanError && error.code === 'TABLE_BALANCE_RESERVED',
  );
});

test('seleção adulterada com item ausente falha por inteiro', () => {
  assert.throws(
    () =>
      buildTablePaymentPlan({
        payment: payment({
          selectionMode: 'SELECTED_ITEMS',
          billItemPublicIds: ['item-a', 'item-de-outro-tenant'],
        }),
        participantId: 10,
        items: baseItems,
      }),
    (error: unknown) =>
      error instanceof TablePaymentPlanError && error.code === 'BILL_ITEM_UNAVAILABLE',
  );
});
