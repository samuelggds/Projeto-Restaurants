import axios from 'axios';
import { describe, expect, it } from 'vitest';
import type { OrderCustomersPage } from '../../../Services/ordersService';
import { createDemoAdminApi } from './demoAdminApi';
import { createInitialDemoState } from './demoDomain';

function fixture() {
  const state = createInitialDemoState();
  const base = state.orders[0];
  state.orders = Array.from({ length: 14 }, (_, index) => ({
    ...base,
    id: 2000 + index,
    customerName: `Cliente ${String(index + 1).padStart(2, '0')}`,
    customerEmail: `cliente${index + 1}@example.test`,
    total: (index + 1) * 10,
  }));
  state.orders.push({ ...state.orders[0], id: 2100, total: 5 });
  const client = axios.create({
    adapter: createDemoAdminApi(
      () => state,
      () => undefined,
    ),
  });
  const report = async (params = {}) =>
    (await client.get<OrderCustomersPage>('/orders/reports/customers', { params })).data;
  return { state, report };
}

describe('clientes do administrador demonstrativo', () => {
  it('retorna indicadores numéricos no contrato da tela real e pagina sem duplicar clientes', async () => {
    const { report } = fixture();
    const first = await report({ sort: 'NAME', limit: 12 });
    expect(first.summary).toEqual({
      customers: 14,
      returningCustomers: 1,
      totalOrders: 15,
      totalMoved: 1055,
    });
    expect(first.customers).toHaveLength(12);
    expect(first).toMatchObject({ total: 14, hasMore: true, nextOffset: 12 });
    const last = await report({ sort: 'NAME', limit: 12, offset: first.nextOffset });
    expect(last.customers).toHaveLength(2);
    expect(last).toMatchObject({ hasMore: false, nextOffset: null });
    expect(
      new Set([...first.customers, ...last.customers].map((customer) => customer.key)).size,
    ).toBe(14);
    expect(last.summary).toEqual(first.summary);
  });

  it('busca por nome ou e-mail, ordena por valor ou pedidos e preserva os indicadores globais', async () => {
    const { report } = fixture();
    expect((await report({ search: 'CLIENTE 03' })).customers[0].email).toBe(
      'cliente3@example.test',
    );
    expect((await report({ search: 'cliente14@' })).total).toBe(1);
    expect((await report({ sort: 'VALUE' })).customers[0].name).toBe('Cliente 14');
    expect((await report({ sort: 'ORDERS' })).customers[0].name).toBe('Cliente 01');
    const empty = await report({ search: 'inexistente' });
    expect(empty).toMatchObject({ customers: [], total: 0, hasMore: false, nextOffset: null });
    expect(empty.summary.customers).toBe(14);
  });

  it('acompanha novos pedidos do cenário e respeita a visibilidade de pagamentos do produto', async () => {
    const { state, report } = fixture();
    state.orders.push({
      ...state.orders[0],
      id: 2200,
      customerEmail: 'novo@example.test',
      paid: false,
      paymentMethod: 'PIX',
    });
    expect((await report()).summary.customers).toBe(14);
    state.orders.at(-1)!.paid = true;
    expect((await report()).summary.customers).toBe(15);
    state.orders = [];
    expect((await report()).summary).toEqual({
      customers: 0,
      returningCustomers: 0,
      totalOrders: 0,
      totalMoved: 0,
    });
  });
});
