import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePlanChangeEligibility } from './PlanChangePolicy.js';

const now = new Date('2026-08-12T12:00:00.000Z');

test('bloqueia enquanto existe fatura vencida sem pagamento', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    invoices: [{ id: 2, status: 'PENDENTE', dueDate: '2026-08-10T12:00:00.000Z' }],
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /Pague a fatura vencida/);
});

test('libera uma escolha quando a fatura foi paga depois do vencimento', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    invoices: [
      {
        id: 3,
        status: 'PAGO',
        dueDate: '2026-08-10T12:00:00.000Z',
        paidAt: '2026-08-11T12:00:00.000Z',
      },
    ],
  });

  assert.equal(result.allowed, true);
  assert.equal(result.invoiceId, 3);
});

test('não reutiliza a mesma fatura para uma segunda escolha', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    consumedInvoiceId: 3,
    invoices: [
      {
        id: 3,
        status: 'PAGO',
        dueDate: '2026-08-10T12:00:00.000Z',
        paidAt: '2026-08-11T12:00:00.000Z',
      },
    ],
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /já foi registrada/);
});

test('fatura pendente futura não bloqueia uma escolha já liberada', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    invoices: [
      { id: 4, status: 'PENDENTE', dueDate: '2026-09-10T12:00:00.000Z' },
      {
        id: 3,
        status: 'PAGO',
        dueDate: '2026-08-10T12:00:00.000Z',
        paidAt: '2026-08-11T12:00:00.000Z',
      },
    ],
  });

  assert.equal(result.allowed, true);
  assert.equal(result.invoiceId, 3);
});
