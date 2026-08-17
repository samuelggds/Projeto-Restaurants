import { describe, expect, it } from 'vitest';
import {
  compareReadyForPickupOrders,
  filterCourierOrders,
  isReadyForCourierPickup,
} from './courierOrders';

describe('courierOrders', () => {
  it('aceita somente delivery pronto para retirada', () => {
    expect(isReadyForCourierPickup({ type: 'DELIVERY', status: 'PRONTO' })).toBe(true);
    expect(isReadyForCourierPickup({ type: 'MESA', status: 'PRONTO' })).toBe(false);
  });
  it('ordena os pedidos mais antigos primeiro', () => {
    const orders = [
      { id: 2, createdAt: '2026-08-10T12:00:00Z' },
      { id: 1, createdAt: '2026-08-10T11:00:00Z' },
    ];
    expect(orders.sort(compareReadyForPickupOrders).map((order) => order.id)).toEqual([1, 2]);
  });
  it('filtra por status e pelo número pesquisado', () => {
    expect(
      filterCourierOrders(
        [
          { id: 48, status: 'PRONTO' },
          { id: 49, status: 'ENTREGUE' },
        ],
        'PRONTO',
        '#48',
      ),
    ).toHaveLength(1);
  });
});
