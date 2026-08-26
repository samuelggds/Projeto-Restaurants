import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateCentsAcrossTableBillItems,
  calculateTableBillItemLedger,
} from './tablePaymentAllocation.js';

test('calcula pagamento parcial sem liberar nem cobrar centavos duas vezes', () => {
  const ledger = calculateTableBillItemLedger({
    unitPriceCents: 1_000,
    projectedStatus: 'UNPAID',
    allocations: [
      { amountCents: 300, intentStatus: 'PAID' },
      {
        amountCents: 200,
        intentStatus: 'RESERVED',
        expiresAt: new Date('2026-08-26T11:00:00.000Z'),
      },
      {
        amountCents: 100,
        intentStatus: 'PROCESSING',
        expiresAt: new Date('2026-08-26T11:00:00.000Z'),
      },
      { amountCents: 400, intentStatus: 'FAILED' },
    ],
    now: new Date('2026-08-26T10:00:00.000Z'),
  });

  assert.deepEqual(ledger, {
    unitPriceCents: 1_000,
    paidCents: 300,
    reservedCents: 200,
    processingCents: 100,
    availableCents: 400,
    projectedStatus: 'PROCESSING',
  });
});

test('reserva expirada deixa de bloquear o item', () => {
  const ledger = calculateTableBillItemLedger({
    unitPriceCents: 999,
    projectedStatus: 'RESERVED',
    allocations: [
      {
        amountCents: 999,
        intentStatus: 'RESERVED',
        expiresAt: new Date('2026-08-26T09:59:59.000Z'),
      },
    ],
    now: new Date('2026-08-26T10:00:00.000Z'),
  });

  assert.equal(ledger.availableCents, 999);
  assert.equal(ledger.reservedCents, 0);
  assert.equal(ledger.projectedStatus, 'UNPAID');
});

test('preserva itens legados pagos que ainda não possuem alocação', () => {
  const ledger = calculateTableBillItemLedger({
    unitPriceCents: 2_490,
    projectedStatus: 'PAID',
    allocations: [],
  });

  assert.equal(ledger.paidCents, 2_490);
  assert.equal(ledger.availableCents, 0);
});

test('distribui uma parte igual por várias unidades e preserva o centavo final', () => {
  const allocations = allocateCentsAcrossTableBillItems(
    [
      { id: 1, publicId: 'a', availableCents: 30 },
      { id: 2, publicId: 'b', availableCents: 40 },
      { id: 3, publicId: 'c', availableCents: 30 },
    ],
    34,
  );

  assert.deepEqual(allocations, [
    { tableBillItemId: 1, tableBillItemPublicId: 'a', amountCents: 30 },
    { tableBillItemId: 2, tableBillItemPublicId: 'b', amountCents: 4 },
  ]);
  assert.equal(
    allocations.reduce((total, allocation) => total + allocation.amountCents, 0),
    34,
  );
});

test('rejeita alocações concorrentes que ultrapassem o preço da unidade', () => {
  assert.throws(
    () =>
      calculateTableBillItemLedger({
        unitPriceCents: 100,
        projectedStatus: 'UNPAID',
        allocations: [
          { amountCents: 60, intentStatus: 'PAID' },
          { amountCents: 50, intentStatus: 'PROCESSING' },
        ],
      }),
    /ultrapassam/,
  );
});
