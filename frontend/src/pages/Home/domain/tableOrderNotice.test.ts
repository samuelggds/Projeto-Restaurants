import { describe, expect, it } from 'vitest';
import { getTableOrderNotice } from './tableOrderNotice';

describe('getTableOrderNotice', () => {
  it.each([
    ['PENDENTE', 'Pedido recebido', 1],
    ['PREPARANDO', 'Em preparo', 2],
    ['PRONTO', 'Pronto para servir', 3],
    ['ENTREGUE', 'Servido na mesa', 4],
  ])('traduz %s para o acompanhamento exclusivo da mesa', (status, label, progress) => {
    expect(
      getTableOrderNotice({
        publicId: 'order-public-id',
        type: 'MESA',
        status,
        items: [{ product: { name: 'Pizza Calabresa' } }],
      }),
    ).toEqual({
      publicId: 'order-public-id',
      status,
      summary: 'Pizza Calabresa',
      items: [
        {
          name: 'Pizza Calabresa',
          quantity: 1,
          customizations: [],
        },
      ],
      statusLabel: label,
      progress,
      cancelled: false,
    });
  });

  it('não transforma um pedido de delivery em status do cardápio digital', () => {
    expect(
      getTableOrderNotice({
        publicId: 'delivery-id',
        type: 'DELIVERY',
        status: 'ENTREGUE',
      }),
    ).toBeNull();
  });

  it('explica o cancelamento sem reutilizar etapas de entrega', () => {
    expect(
      getTableOrderNotice({ publicId: 'cancelled-id', type: 'MESA', status: 'CANCELADO' }),
    ).toMatchObject({
      statusLabel: 'Pedido cancelado',
      progress: 0,
      cancelled: true,
    });
  });

  it('preserva todos os itens, montagens e observações do pedido', () => {
    const result = getTableOrderNotice({
      publicId: 'complete-order-id',
      type: 'MESA',
      status: 'PREPARANDO',
      items: [
        {
          quantity: 2,
          observation: 'Sem cortar',
          product: { name: 'Pizza da casa' },
          customizations: [
            {
              groupName: 'Massa',
              options: [{ name: 'Massa fina' }],
            },
            {
              groupName: 'Adicionais',
              options: [{ name: 'Bacon' }, { name: 'Queijo' }],
            },
          ],
        },
        {
          quantity: 1,
          product: { name: 'Suco de laranja' },
          ingredients: [{ name: 'Sem açúcar' }],
        },
      ],
    });

    expect(result?.summary).toBe('Pizza da casa + 1 item');
    expect(result?.items).toEqual([
      {
        name: 'Pizza da casa',
        quantity: 2,
        observation: 'Sem cortar',
        customizations: [
          { groupName: 'Massa', options: ['Massa fina'] },
          { groupName: 'Adicionais', options: ['Bacon', 'Queijo'] },
        ],
      },
      {
        name: 'Suco de laranja',
        quantity: 1,
        customizations: [{ groupName: 'Ingredientes', options: ['Sem açúcar'] }],
      },
    ]);
  });
});
