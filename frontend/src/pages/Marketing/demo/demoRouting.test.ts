import { describe, expect, it } from 'vitest';
import axios from 'axios';
import {
  createDemoOrder,
  createInitialDemoState,
  addDemoCartItem,
  updateDemoOrderStatus,
} from './demoDomain';
import { demoOperationalOrders, demoWaiterAccounts } from './demoEmployeeAdapter';
import { demoCourierOrders } from './demoCourierAdapter';
import { createDemoAdminApi, type DemoAdminRuntime } from './demoAdminApi';

describe('rotas e isolamento da demonstração', () => {
  it('restaura impressão e regras fictícias ao reabrir o admin e rejeita estorno sem provedor', async () => {
    const state = createInitialDemoState();
    let saved: DemoAdminRuntime | undefined;
    const client = axios.create({
      adapter: createDemoAdminApi(
        () => state,
        () => undefined,
        undefined,
        (value) => {
          saved = structuredClone(value);
        },
      ),
    });
    await client.put('/kitchen-printing/settings', { copies: 2 });
    await client.post('/kitchen-printing/test');
    await client.put('/courier-compensation/admin/configuration', {
      model: 'FIXED_PER_DELIVERY',
      fixedAmount: 7.5,
      timezone: 'America/Sao_Paulo',
    });
    const reopened = axios.create({
      adapter: createDemoAdminApi(
        () => state,
        () => undefined,
        saved,
      ),
    });
    expect((await reopened.get('/kitchen-printing/settings')).data.settings.copies).toBe(2);
    expect((await reopened.get('/kitchen-printing/jobs')).data).toHaveLength(1);
    expect(
      (await reopened.get('/courier-compensation/admin/configuration')).data.defaultPolicy
        .fixedAmount,
    ).toBe(7.5);
    await expect(reopened.patch('/orders/1058/refund')).rejects.toMatchObject({
      code: 'DEMO_ONLY',
    });
    await expect(reopened.get('/orders/1056/confirm-payment')).rejects.toMatchObject({
      code: 'DEMO_ONLY',
    });
    expect(state.orders.find((order) => order.id === 1056)?.paid).toBe(false);
  });
  it('separa entregas do motoqueiro e pedidos da mesa com todos os canais na cozinha', () => {
    let state = createInitialDemoState();
    for (const channel of ['DELIVERY', 'TABLE', 'PICKUP'] as const) {
      state = addDemoCartItem(state, { id: 'pizza-house', name: 'Pizza da Casa', price: 59.9 });
      state = createDemoOrder(state, { channel, tableNumber: 8, paymentMethod: 'CARD' }).state;
    }
    const created = state.orders.slice(0, 3);
    expect(
      demoOperationalOrders(state).filter((order) =>
        created.some((item) => String(item.id) === order.id),
      ),
    ).toHaveLength(3);
    expect(demoCourierOrders(state).every((order) => order.channel === 'DELIVERY')).toBe(true);
    const tableOrder = created.find((order) => order.channel === 'TABLE')!;
    expect(demoCourierOrders(state).some((order) => order.id === tableOrder.id)).toBe(false);
    const table = demoWaiterAccounts(state).find((account) => account.tableNumber === 8)!;
    expect(table.summary.consumedCents).toBe(11980);
    expect(table.summary.netPaidCents).toBe(5990);
  });

  it('API administrativa fictícia atualiza o cenário compartilhado sem HTTP', async () => {
    let state = createInitialDemoState();
    const client = axios.create({
      adapter: createDemoAdminApi(
        () => state,
        (next) => {
          state = next;
        },
      ),
    });
    const pending = state.orders.find((order) => order.channel === 'PICKUP')!;
    await client.patch(`/orders/${pending.id}/confirm-payment`);
    expect(state.orders.find((order) => order.id === pending.id)?.paid).toBe(true);
    await client.patch(`/orders/${pending.id}/cancel`);
    expect(state.orders.find((order) => order.id === pending.id)?.status).toBe('CANCELADO');
    const result = await client.get('/orders', { params: { limit: 2 } });
    expect(result.data.orders).toHaveLength(2);
    expect(result.data.hasMore).toBe(true);
    expect(result.data.nextCursor).toBe(result.data.orders[1].id);
    await expect(client.post('https://production.invalid/unknown', {})).rejects.toMatchObject({
      code: 'DEMO_ONLY',
      response: { status: 422 },
    });
  });

  it('filtra filas e pagina sem misturar pagamentos pendentes com concluídos', async () => {
    const state = updateDemoOrderStatus(createInitialDemoState(), 1056, 'CANCELADO');
    const client = axios.create({
      adapter: createDemoAdminApi(
        () => state,
        () => undefined,
      ),
    });
    const page = await client.get('/orders', { params: { queue: 'PAYMENT' } });
    expect(page.data.orders.map((order: { id: number }) => order.id)).toEqual([1057]);
    const ready = await client.get('/orders', { params: { status: 'PRONTO', search: '#1058' } });
    expect(ready.data.orders).toHaveLength(1);
    const after = await client.get('/orders', { params: { cursor: 1057, limit: 2 } });
    expect(after.data.orders.map((order: { id: number }) => order.id)).toEqual([1056, 1055]);
  });
});
