import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateMrr,
  deriveSupportTicketStatus,
  deriveTenantStatus,
  mapInvoiceStatus,
} from './superAdminMappings.js';

test('status do tenant preserva a causa financeira mesmo quando o billing desativou o restaurante', () => {
  assert.equal(
    deriveTenantStatus({ active: false, subscriptionStatus: 'ATIVA', hasOverdueInvoice: true }),
    'OVERDUE',
  );
  assert.equal(
    deriveTenantStatus({ active: false, subscriptionStatus: 'CANCELADA', hasOverdueInvoice: true }),
    'CANCELED',
  );
  assert.equal(
    deriveTenantStatus({ active: false, subscriptionStatus: 'ATIVA', hasOverdueInvoice: false }),
    'BLOCKED',
  );
  assert.equal(
    deriveTenantStatus({ active: true, subscriptionStatus: 'TESTE', hasOverdueInvoice: false }),
    'TRIAL',
  );
});

test('status das faturas é traduzido sem confundir cancelamento com estorno', () => {
  assert.equal(mapInvoiceStatus('PAGO'), 'PAID');
  assert.equal(mapInvoiceStatus('PENDENTE'), 'PENDING');
  assert.equal(mapInvoiceStatus('ATRASADO'), 'OVERDUE');
  assert.equal(mapInvoiceStatus('CANCELADO'), 'CANCELED');
});

test('status de suporte é derivado do último remetente sem prioridade ou SLA inventados', () => {
  assert.equal(deriveSupportTicketStatus('SUPER_ADMIN'), 'WAITING_CUSTOMER');
  assert.equal(deriveSupportTicketStatus('ADMIN'), 'OPEN');
  assert.equal(deriveSupportTicketStatus('FUNCIONARIO'), 'OPEN');
});

test('MRR soma somente mensalidades das assinaturas ATIVA', () => {
  const fees = new Map([
    ['BASICO', 149.9],
    ['PREMIUM', 249.9],
  ]);
  const result = calculateMrr(
    [
      { status: 'ATIVA', plan: 'BASICO' },
      { status: 'ATIVA', plan: 'PREMIUM' },
      { status: 'TESTE', plan: 'PREMIUM' },
      { status: 'CANCELADA', plan: 'BASICO' },
    ],
    fees,
  );
  assert.equal(result, 399.8);
});

