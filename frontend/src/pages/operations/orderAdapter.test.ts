import { describe, expect, it } from 'vitest';
import { formatElapsed, mapOperationalOrders, mapRestaurantBrand } from './orderAdapter';

describe('operational order adapter', () => {
  it('formata o tempo de espera', () => {
    expect(formatElapsed('2026-08-10T10:00:00.000Z', Date.parse('2026-08-10T10:02:05.000Z'))).toBe(
      '02:05',
    );
  });
  it('reconhece mesa, delivery e itens', () => {
    const [order] = mapOperationalOrders([
      { id: 9, type: 'MESA', tableNumber: 4, items: [{ quantity: 2, product: { name: 'Pizza' } }] },
    ]);
    expect(order).toMatchObject({
      id: '#9',
      channel: 'TABLE',
      reference: 'Mesa 4',
      items: ['2× Pizza'],
    });
  });
  it('monta a identidade do restaurante', () => {
    expect(
      mapRestaurantBrand({ restaurant: { name: 'North Pizza' }, primaryColor: '#f00' }),
    ).toEqual({ restaurantName: 'North Pizza', monogram: 'NP', primaryColor: '#f00' });
  });
});
