import { describe, expect, it } from 'vitest';
import { badgeDisplayCount, waiterNavigationCounters } from './waiterNavigationCounters';
import type { Order, ServiceCall, WaiterAccountSession } from '../types';

const order = (id: string, status: Order['status'], channel: Order['channel'] = 'TABLE'): Order => ({
  id, channel, status, reference: 'Mesa 01', items: [], createdAt: '19:00',
  elapsed: '01:00', total: 25,
});
const call = (id: string, status: ServiceCall['status']): ServiceCall => ({
  id, status, type: 'WAITER', tableNumber: 1, elapsed: '01:00',
});
const count = (orders: Order[], calls: ServiceCall[]) => waiterNavigationCounters({
  orders, calls, accounts: [],
});

describe('contadores operacionais do garçom', () => {
  it('conta exclusivamente pedidos de mesa prontos, sem entregues, cancelados ou outros canais', () => {
    expect(count([
      order('#1', 'PRONTO'), order('#2', 'PENDENTE'),
      order('#3', 'PREPARANDO'), order('#4', 'ENTREGUE'),
      order('#5', 'CANCELADO'), order('#6', 'PRONTO', 'DELIVERY'),
      order('#7', 'PRONTO', 'PICKUP'),
    ], []).readyOrders).toBe(1);
  });

  it('aumenta com novos pedidos prontos e diminui quando são entregues', () => {
    expect(count([], []).readyOrders).toBe(0);
    expect(count([order('#1', 'PRONTO'), order('#2', 'PRONTO')], []).readyOrders).toBe(2);
    expect(count([order('#1', 'ENTREGUE'), order('#2', 'PRONTO')], []).readyOrders).toBe(1);
    expect(count([order('#1', 'ENTREGUE'), order('#2', 'ENTREGUE')], []).readyOrders).toBe(0);
  });

  it('chamados continuam no contador durante atendimento e saem após conclusão', () => {
    expect(count([], [call('1', 'WAITING'), call('2', 'IN_PROGRESS'),
      call('3', 'RESOLVED')]).activeCalls).toBe(2);
    expect(count([], [call('1', 'IN_PROGRESS'), call('2', 'IN_PROGRESS')]).activeCalls).toBe(2);
    expect(count([], [call('1', 'RESOLVED'), call('2', 'IN_PROGRESS')]).activeCalls).toBe(1);
    expect(count([], [call('1', 'RESOLVED'), call('2', 'RESOLVED')]).activeCalls).toBe(0);
  });

  it('não duplica registros repetidos da mesma consulta e limita apenas o texto do badge', () => {
    expect(count([order('#1', 'PRONTO'), order('#1', 'PRONTO')],
      [call('1', 'WAITING'), call('1', 'WAITING')])).toMatchObject({
        readyOrders: 1, activeCalls: 1,
      });
    expect(badgeDisplayCount(0)).toBe('0');
    expect(badgeDisplayCount(12)).toBe('12');
    expect(badgeDisplayCount(120)).toBe('99+');
  });

  it('mantém pagamentos pendentes separados de pedidos e chamados', () => {
    const account = {
      pendingManualPayments: [{ publicId: 'pay-1' }, { publicId: 'pay-2' }],
    } as WaiterAccountSession;
    const result = waiterNavigationCounters({
      orders: [order('#1','PRONTO')], calls: [call('1','WAITING')], accounts: [account],
    });
    expect(result).toEqual({ readyOrders: 1, activeCalls: 1, pendingPayments: 2 });
  });
});
