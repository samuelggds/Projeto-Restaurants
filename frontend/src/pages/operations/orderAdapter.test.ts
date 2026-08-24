import { describe, expect, it } from 'vitest';
import { formatElapsed, mapOperationalOrders, mapRestaurantBrand } from './orderAdapter';

describe('operational order adapter', () => {
  it('formata o tempo de espera', () => {
    expect(formatElapsed('2026-08-10T10:00:00.000Z', Date.parse('2026-08-10T10:02:05.000Z'))).toBe(
      '02:05',
    );
  });
  it('reconhece a mesa no formato real retornado pelo backend e preserva os itens', () => {
    const [order] = mapOperationalOrders([
      {
        id: 9,
        type: 'MESA',
        table: { id: 91, number: 4 },
        user: { id: 3, name: 'Cliente da mesa' },
        items: [{ quantity: 2, product: { name: 'Pizza' } }],
      },
    ]);
    expect(order).toMatchObject({
      id: '#9',
      channel: 'TABLE',
      reference: 'Mesa 4',
      customer: 'Cliente da mesa',
      items: ['2× Pizza'],
      itemDetails: [
        {
          name: 'Pizza',
          quantity: 2,
          customizations: [],
        },
      ],
    });
  });
  it('usa os timestamps reais de entrega e cancelamento no histórico', () => {
    const [delivered, cancelled] = mapOperationalOrders([
      {
        id: 12,
        type: 'DELIVERY',
        status: 'ENTREGUE',
        deliveredAt: '2026-08-24T18:31:00.000Z',
      },
      {
        id: 13,
        type: 'RETIRADA',
        status: 'CANCELADO',
        updatedAt: '2026-08-24T18:32:00.000Z',
      },
    ]);

    expect(delivered.completedAtIso).toBe('2026-08-24T18:31:00.000Z');
    expect(cancelled.completedAtIso).toBe('2026-08-24T18:32:00.000Z');
    expect(delivered.completedAt).not.toBeUndefined();
    expect(cancelled.completedAt).not.toBeUndefined();
  });
  it('preserva montagem por categoria e observações para a cozinha', () => {
    const [order] = mapOperationalOrders([
      {
        id: 10,
        type: 'DELIVERY',
        observation: 'Entregar junto com o molho',
        items: [
          {
            quantity: 1,
            product: { name: 'Pizza da casa' },
            observation: 'Assar bem a massa',
            ingredients: [
              { id: 1, name: 'Massa fina', price: 0 },
              { id: 2, name: 'Bacon', price: 10 },
            ],
            customizations: [
              {
                groupName: 'Massa',
                options: [{ optionId: 1, name: 'Massa fina', price: 0 }],
              },
              {
                groupName: 'Adicionais',
                options: [{ optionId: 2, name: 'Bacon', price: 10 }],
              },
            ],
          },
        ],
      },
    ]);

    expect(order).toMatchObject({
      observation: 'Entregar junto com o molho',
      itemDetails: [
        {
          name: 'Pizza da casa',
          quantity: 1,
          observation: 'Assar bem a massa',
          customizations: [
            { groupName: 'Massa', options: ['Massa fina'] },
            { groupName: 'Adicionais', options: ['Bacon'] },
          ],
        },
      ],
    });
  });
  it('aceita ingredientes de pedidos antigos sem categoria e ignora dados inválidos', () => {
    const [order] = mapOperationalOrders([
      {
        id: 11,
        items: [
          {
            quantity: 1,
            productName: 'Massa antiga',
            customizations: 'formato antigo',
            ingredients: ['Molho branco', { name: 'Queijo' }, null, { price: 12 }],
          },
        ],
      },
    ]);

    expect(order.itemDetails?.[0].customizations).toEqual([
      { groupName: 'Itens escolhidos', options: ['Molho branco', 'Queijo'] },
    ]);
  });
  it('descarta entradas sem pedido e normaliza datas, total e status inválidos', () => {
    const orders = mapOperationalOrders([
      null,
      {},
      {
        id: 14,
        status: 'DESCONHECIDO',
        createdAt: 'data inválida',
        total: 'valor inválido',
        observation: { unsafe: true },
      },
    ]);

    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({
      id: '#14',
      status: 'PENDENTE',
      createdAt: '--:--',
      elapsed: '00:00',
      total: 0,
      observation: undefined,
    });
  });
  it('monta a identidade do restaurante', () => {
    expect(
      mapRestaurantBrand({ restaurant: { name: 'North Pizza' }, primaryColor: '#f00' }),
    ).toEqual({ restaurantName: 'North Pizza', monogram: 'NP', primaryColor: '#f00' });
  });
});
