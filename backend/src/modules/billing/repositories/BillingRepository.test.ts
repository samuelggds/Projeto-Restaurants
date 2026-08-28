// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import billingRepository from './BillingRepository.js';

test('compare-and-set perdido devolve o pagamento vencedor sem sobrescrever paidAt', async () => {
  const winnerPaidAt = new Date('2026-08-10T10:00:00.000Z');
  const losingPaidAt = new Date('2026-08-10T10:00:01.000Z');
  let updateArguments = null;

  const db = {
    invoice: {
      updateMany: async (arguments_) => {
        updateArguments = arguments_;
        return { count: 0 };
      },
      findUnique: async () => ({
        id: 42,
        restaurantId: 5,
        status: 'PAGO',
        paidAt: winnerPaidAt,
      }),
    },
  };

  const result = await billingRepository.markInvoicePaidIfOpen(42, losingPaidAt, db);

  assert.deepEqual(updateArguments.where, {
    id: 42,
    status: { in: ['PENDENTE', 'ATRASADO'] },
  });
  assert.equal(updateArguments.data.paidAt, losingPaidAt);
  assert.equal(result.marked, false);
  assert.equal(result.invoice.paidAt, winnerPaidAt);
});

test('cria a mensalidade com upsert na chave única do restaurante e competência', async () => {
  let upsertArguments = null;
  const data = {
    restaurantId: 5,
    month: 8,
    year: 2026,
    monthlyFee: 99,
    systemFees: 0,
    total: 99,
    dueDate: new Date('2026-08-31T12:00:00.000Z'),
    status: 'PENDENTE',
  };
  const db = {
    invoice: {
      upsert: async (arguments_) => {
        upsertArguments = arguments_;
        return { id: 42, ...data };
      },
    },
  };

  const invoice = await billingRepository.createMonthlyInvoiceIfAbsent(data, db);

  assert.deepEqual(upsertArguments.where, {
    restaurantId_month_year: { restaurantId: 5, month: 8, year: 2026 },
  });
  assert.deepEqual(upsertArguments.create, data);
  assert.deepEqual(upsertArguments.update, {});
  assert.equal(invoice.id, 42);
});

test('claim da reconciliação usa relógio do banco, SKIP LOCKED e backoff limitado', async () => {
  let query = null;
  const rows = [
    {
      id: 7,
      paymentLink: 'https://pay.example/7',
      paymentExternalId: 'payment-7',
      total: '99.90',
      reconciliationAttempts: 2,
    },
  ];
  const db = {
    $queryRaw: async (receivedQuery) => {
      query = receivedQuery;
      return rows;
    },
  };

  const result = await billingRepository.claimInvoicesForReconciliation(25, db);

  assert.equal(result, rows);
  assert.match(query.sql, /FOR UPDATE SKIP LOCKED/u);
  assert.match(query.sql, /"nextReconciliationAt" <= clock_timestamp\(\)/u);
  assert.match(query.sql, /"paymentExternalId" IS NOT NULL/u);
  assert.match(query.sql, /LEAST\(/u);
  assert.deepEqual(query.values, [25]);
  await assert.rejects(
    () => billingRepository.claimInvoicesForReconciliation(201, db),
    /entre 1 e 200/u,
  );
});
