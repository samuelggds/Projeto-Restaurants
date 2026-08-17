import { describe, expect, it } from 'vitest';
import {
  calculateOverviewMetrics,
  filterCustomerSummaries,
  summarizeCustomers,
} from './adminOverview';
import type { AdminOrder } from '../types';

function order(overrides: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: '#1',
    numericId: 1,
    customerName: 'Cliente',
    customerEmail: 'cliente@teste.com',
    total: 40,
    status: 'PENDENTE',
    createdAt: '2026-08-10T12:00:00.000Z',
    ...overrides,
  } as AdminOrder;
}

describe('visão geral administrativa', () => {
  it('calcula vendas e ticket somente com pedidos não cancelados do dia', () => {
    const now = new Date('2026-08-10T18:00:00.000Z');
    const metrics = calculateOverviewMetrics(
      [
        order({ total: 40 }),
        order({ numericId: 2, id: '#2', total: 60 }),
        order({ numericId: 3, id: '#3', total: 100, status: 'CANCELADO' }),
        order({ numericId: 4, id: '#4', total: 200, createdAt: '2026-08-09T12:00:00.000Z' }),
      ],
      now,
    );

    expect(metrics.sales).toBe(100);
    expect(metrics.todayOrders).toHaveLength(2);
    expect(metrics.averageTicket).toBe(50);
  });

  it('agrupa pedidos do mesmo cliente', () => {
    const customers = summarizeCustomers([
      order({ total: 20 }),
      order({ numericId: 2, id: '#2', total: 30 }),
    ]);

    expect(customers).toEqual([expect.objectContaining({ count: 2, total: 50 })]);
  });

  it('filtra clientes por nome ou e-mail', () => {
    const customers = summarizeCustomers([
      order({ customerName: 'João Silva', customerEmail: 'joao@teste.com' }),
      order({
        numericId: 2,
        id: '#2',
        customerName: 'Maria Souza',
        customerEmail: 'maria@teste.com',
      }),
    ]);
    expect(filterCustomerSummaries(customers, 'MARIA')).toEqual([
      expect.objectContaining({ name: 'Maria Souza' }),
    ]);
    expect(filterCustomerSummaries(customers, 'joao@teste.com')).toEqual([
      expect.objectContaining({ name: 'João Silva' }),
    ]);
  });
});
