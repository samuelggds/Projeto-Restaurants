import test from 'node:test';
import assert from 'node:assert/strict';
import { hasBlockingInvoices, isInvoiceBlocking } from './billingRules.js';
import { addDays } from './dateUtils.js';

test('deve bloquear invoice pendente apos 30 dias + 5 dias uteis', () => {
  const createdAt = new Date('2026-06-01T12:00:00.000Z');
  const dueDate = addDays(createdAt, 30);
  const now = new Date('2026-07-09T12:00:00.000Z');

  const invoice = {
    status: 'PENDENTE',
    dueDate,
  };

  assert.equal(isInvoiceBlocking(invoice, now), true);
});

test('nao deve bloquear invoice pendente dentro da tolerancia', () => {
  const createdAt = new Date('2026-06-01T12:00:00.000Z');
  const dueDate = addDays(createdAt, 30);
  const now = new Date('2026-07-08T12:00:00.000Z');

  const invoice = {
    status: 'PENDENTE',
    dueDate,
  };

  assert.equal(isInvoiceBlocking(invoice, now), false);
});

test('so deve reativar quando nao houver invoice bloqueante em aberto', () => {
  const now = new Date('2026-07-09T12:00:00.000Z');

  const openInvoicesWithBlocking = [
    {
      status: 'PENDENTE',
      dueDate: new Date('2026-07-01T12:00:00.000Z'),
    },
    {
      status: 'ATRASADO',
      dueDate: new Date('2026-06-20T12:00:00.000Z'),
    },
  ];

  const openInvoicesWithoutBlocking = [
    {
      status: 'PENDENTE',
      dueDate: new Date('2026-07-02T12:00:00.000Z'),
    },
  ];

  assert.equal(hasBlockingInvoices(openInvoicesWithBlocking, now), true);
  assert.equal(hasBlockingInvoices(openInvoicesWithoutBlocking, now), false);
});

test('nao deve considerar invoice paga como bloqueante', () => {
  const now = new Date('2026-07-09T12:00:00.000Z');
  const paidInvoice = {
    status: 'PAGO',
    dueDate: new Date('2026-07-01T12:00:00.000Z'),
  };

  assert.equal(isInvoiceBlocking(paidInvoice, now), false);
});

test('lista vazia nao deve bloquear', () => {
  const now = new Date('2026-07-09T12:00:00.000Z');
  assert.equal(hasBlockingInvoices([], now), false);
});
