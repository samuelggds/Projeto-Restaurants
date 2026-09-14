import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addBillingMonth,
  getInvoiceCreationDate,
  getInvoiceOpenDaysBeforeDue,
  invoicePeriodFromDueDate,
  isInvoiceCreationDue,
  nextSubscriptionPeriod,
  resolveSubscriptionDueDate,
} from './billingCycle.js';

test('usa cinco dias como janela padrão para criar a cobrança', () => {
  assert.equal(getInvoiceOpenDaysBeforeDue({}), 5);
  assert.equal(getInvoiceOpenDaysBeforeDue({ BILLING_INVOICE_OPEN_DAYS_BEFORE_DUE: '7' }), 7);
  assert.equal(getInvoiceOpenDaysBeforeDue({ BILLING_INVOICE_OPEN_DAYS_BEFORE_DUE: '99' }), 5);
});

test('abre a cobrança antes do vencimento sem alterar o horário', () => {
  const dueDate = new Date('2026-10-11T15:30:00.000Z');
  assert.equal(
    getInvoiceCreationDate(dueDate, { BILLING_INVOICE_OPEN_DAYS_BEFORE_DUE: '5' }).toISOString(),
    '2026-10-06T15:30:00.000Z',
  );
  assert.equal(
    isInvoiceCreationDue(
      dueDate,
      new Date('2026-10-06T15:30:00.000Z'),
      { BILLING_INVOICE_OPEN_DAYS_BEFORE_DUE: '5' },
    ),
    true,
  );
});

test('avança por mês de calendário e limita o dia ao fim do mês', () => {
  assert.equal(addBillingMonth(new Date('2026-01-31T12:00:00.000Z')).toISOString(), '2026-02-28T12:00:00.000Z');
  assert.equal(addBillingMonth(new Date('2028-01-31T12:00:00.000Z')).toISOString(), '2028-02-29T12:00:00.000Z');
  assert.equal(addBillingMonth(new Date('2026-09-11T12:00:00.000Z')).toISOString(), '2026-10-11T12:00:00.000Z');
});

test('resolve o vencimento pelo período atual e usa trial como fallback', () => {
  const periodEnd = new Date('2026-11-11T12:00:00.000Z');
  const trialEnd = new Date('2026-10-11T12:00:00.000Z');
  assert.equal(
    resolveSubscriptionDueDate({ currentPeriodEnd: periodEnd, trialEndsAt: trialEnd })?.toISOString(),
    periodEnd.toISOString(),
  );
  assert.equal(
    resolveSubscriptionDueDate({ currentPeriodEnd: null, trialEndsAt: trialEnd })?.toISOString(),
    trialEnd.toISOString(),
  );
});

test('deriva chave mensal e próximo período a partir do vencimento real', () => {
  const dueDate = new Date('2026-10-11T12:00:00.000Z');
  assert.deepEqual(invoicePeriodFromDueDate(dueDate), { month: 10, year: 2026 });
  const next = nextSubscriptionPeriod(dueDate);
  assert.equal(next.currentPeriodStart.toISOString(), '2026-10-11T12:00:00.000Z');
  assert.equal(next.currentPeriodEnd.toISOString(), '2026-11-11T12:00:00.000Z');
});
