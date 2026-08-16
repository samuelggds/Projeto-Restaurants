import { describe, expect, it } from 'vitest';
import { filterAdminOrders, getNextOrderStatuses } from './adminOrders';
import type { AdminOrder } from '../types';

const orders = [
  { id: '#100', numericId: 100, customerName: 'João Silva', status: 'PENDENTE', total: 40 },
  { id: '#101', numericId: 101, customerName: 'Maria Souza', status: 'PREPARANDO', total: 60 },
] as AdminOrder[];

describe('pedidos administrativos', () => {
  it('busca por cliente ou número do pedido sem diferenciar maiúsculas', () => {
    expect(filterAdminOrders(orders, 'joão', '')).toEqual([orders[0]]);
    expect(filterAdminOrders(orders, '#101', '')).toEqual([orders[1]]);
  });

  it('combina busca e filtro de status', () => {
    expect(filterAdminOrders(orders, 'maria', 'PREPARANDO')).toEqual([orders[1]]);
    expect(filterAdminOrders(orders, 'maria', 'PENDENTE')).toEqual([]);
  });

  it('permite somente transições operacionais válidas', () => {
    expect(getNextOrderStatuses('PENDENTE')).toEqual(['PREPARANDO', 'CANCELADO']);
    expect(getNextOrderStatuses('PREPARANDO')).toEqual(['PRONTO']);
    expect(getNextOrderStatuses('ENTREGUE')).toEqual([]);
  });
});
