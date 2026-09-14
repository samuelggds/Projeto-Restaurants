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
  assert.equal(result.invoiceId, 2);
  assert.match(result.reason, /Pague a fatura vencida/);
});

test('libera alteração para assinatura em dia mesmo sem histórico de atraso', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    invoices: [
      {
        id: 3,
        status: 'PAGO',
        dueDate: '2026-08-10T12:00:00.000Z',
        paidAt: '2026-08-10T10:00:00.000Z',
      },
    ],
  });

  assert.equal(result.allowed, true);
  assert.equal(result.invoiceId, 3);
});

test('uma fatura futura pendente não impede alteração de plano', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    invoices: [{ id: 4, status: 'PENDENTE', dueDate: '2026-09-10T12:00:00.000Z' }],
  });

  assert.equal(result.allowed, true);
  assert.equal(result.invoiceId, 4);
});

test('bloqueia nova escolha quando já existe troca agendada', () => {
  const result = evaluatePlanChangeEligibility({
    now,
    hasScheduledPlan: true,
    invoices: [],
  });

  assert.equal(result.allowed, false);
  assert.match(result.reason, /troca de plano agendada/i);
});
