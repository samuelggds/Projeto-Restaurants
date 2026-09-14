import { describe, expect, it } from 'vitest';
import { createInitialDemoState, toggleDemoOrderPaid, updateDemoOrderStatus } from './demoDomain';
import { createDemoAttendantServices, mapDemoAttendantSnapshot } from './demoAttendantAdapter';

const now = Date.parse('2026-09-09T15:00:00.000Z');

function setup() {
  let state = createInitialDemoState(now);
  const services = createDemoAttendantServices({
    getState: () => state,
    onState: (next) => {
      state = next;
    },
    now: () => now,
  });
  return {
    services,
    getState: () => state,
    setState: (next: typeof state) => {
      state = next;
    },
  };
}

describe('local attendant demo adapter', () => {
  it('permite entregar somente retirada pronta e paga, preservando os outros canais', async () => {
    const demo = setup();
    await expect(demo.services.completePickup(1058)).rejects.toMatchObject({
      response: { data: { error: expect.stringContaining('Somente retiradas') } },
    });
    demo.setState(
      toggleDemoOrderPaid(updateDemoOrderStatus(demo.getState(), 1057, 'PRONTO'), 1057),
    );
    await expect(demo.services.completePickup(1057)).rejects.toMatchObject({
      response: { data: { error: expect.stringContaining('Somente retiradas') } },
    });
    demo.setState(updateDemoOrderStatus(demo.getState(), 1056, 'PREPARANDO'));
    demo.setState(updateDemoOrderStatus(demo.getState(), 1056, 'PRONTO'));
    const beforeUnpaidAttempt = demo.getState();
    await expect(demo.services.completePickup(1056)).rejects.toMatchObject({
      response: { data: { error: 'Confirme o pagamento e aguarde o preparo antes de entregar.' } },
    });
    expect(demo.getState()).toBe(beforeUnpaidAttempt);
    demo.setState(toggleDemoOrderPaid(demo.getState(), 1056));
    await demo.services.completePickup(1056);
    expect(demo.getState().orders.find((order) => order.id === 1056)?.status).toBe('ENTREGUE');
    expect(demo.getState().orders.find((order) => order.id === 1058)?.status).toBe('PRONTO');
    expect(demo.getState().orders.find((order) => order.id === 1057)?.status).toBe('PRONTO');
  });

  it('não conclui retirada paga enquanto o preparo não terminou', async () => {
    const demo = setup();
    demo.setState(toggleDemoOrderPaid(demo.getState(), 1056));
    await expect(demo.services.completePickup(1056)).rejects.toMatchObject({
      response: { data: { error: 'Confirme o pagamento e aguarde o preparo antes de entregar.' } },
    });
    demo.setState(updateDemoOrderStatus(demo.getState(), 1056, 'PREPARANDO'));
    await expect(demo.services.completePickup(1056)).rejects.toBeTruthy();
    expect(demo.getState().orders.find((order) => order.id === 1056)).toMatchObject({
      status: 'PREPARANDO',
      paid: true,
    });
    demo.setState(updateDemoOrderStatus(demo.getState(), 1056, 'PRONTO'));
    await demo.services.completePickup(1056);
    expect(demo.getState().orders.find((order) => order.id === 1056)?.status).toBe('ENTREGUE');
  });

  it('cria o pedido escolhido na fila compartilhada sem consumir a sacola do cliente', async () => {
    const demo = setup();
    const cart = [{ productId: 'soda', name: 'Refrigerante', unitPrice: 8.9, quantity: 1 }];
    demo.setState({ ...demo.getState(), cart });
    await demo.services.createOrder({
      type: 'DELIVERY',
      customerName: 'Cliente fictício',
      paymentMethod: 'PIX',
      items: [{ productId: 1, quantity: 2 }],
      address: 'Rua Demo',
      number: '10',
    });
    const order = demo.getState().orders[0];
    expect(order).toMatchObject({
      id: 1059,
      status: 'PENDENTE',
      paid: false,
      channel: 'DELIVERY',
      customerName: 'Cliente fictício',
      total: 65.8,
      items: [{ productId: 'burger-classic', quantity: 2 }],
    });
    expect(demo.getState().cart).toEqual(cart);
    expect(demo.getState().nextOrderNumber).toBe(1060);
    expect(await demo.services.getOrder(1059)).toMatchObject({
      type: 'DELIVERY',
      address: 'Rua Demo',
      number: '10',
      paid: false,
    });
    await expect(
      demo.services.createOrder({ type: 'MESA', items: [{ productId: 1, quantity: 1 }] }),
    ).rejects.toBeTruthy();
  });

  it('atende e resolve chamados no mesmo estado utilizado pelo garçom', async () => {
    const demo = setup();
    await expect(demo.services.updateCallStatus('call-1', 'RESOLVED')).rejects.toBeTruthy();
    await demo.services.updateCallStatus('call-1', 'IN_PROGRESS');
    expect(demo.getState().calls[0].status).toBe('IN_PROGRESS');
    await demo.services.updateCallStatus('call-1', 'RESOLVED');
    expect(demo.getState().calls[0].status).toBe('RESOLVED');
  });

  it('consulta, responde e encerra suporte fictício com histórico local', async () => {
    const { services } = setup();
    const issues = (await services.listOpenOrderIssues()) as Array<{ id: number }>;
    expect(issues).toHaveLength(1);
    const id = issues[0].id;
    expect(await services.getIssueThread(id)).toMatchObject({
      orderStatus: 'PRONTO',
      isResolved: false,
    });
    await services.replyIssue(id, 'Seu pedido já está pronto.');
    expect(await services.getIssueThread(id)).toMatchObject({
      messages: expect.arrayContaining([
        expect.objectContaining({ message: 'Seu pedido já está pronto.', senderType: 'ADMIN' }),
      ]),
    });
    await services.resolveIssue(id);
    expect(await services.listOpenOrderIssues()).toEqual([]);
    expect(services.supportHistory?.orders).toHaveLength(1);
    expect(services.supportHistory?.total).toBe(1);
    await expect(services.replyIssue(id, 'Outra resposta')).rejects.toBeTruthy();
  });

  it('reflete preparo, entrega e ocupação de mesas recebidos de outras áreas', () => {
    const demo = setup();
    demo.setState(updateDemoOrderStatus(demo.getState(), 1057, 'PRONTO'));
    const first = mapDemoAttendantSnapshot(demo.getState(), now);
    expect(first.orders.find((order) => order.orderId === 1057)).toMatchObject({
      status: 'PRONTO',
      type: 'MESA',
    });
    expect(first.orders.some((order) => order.orderId === 1055)).toBe(false);
    expect(first.tables).toHaveLength(2);
    demo.setState(updateDemoOrderStatus(demo.getState(), 1057, 'ENTREGUE'));
    expect(
      mapDemoAttendantSnapshot(demo.getState(), now).orders.some((order) => order.orderId === 1057),
    ).toBe(false);
  });
});
