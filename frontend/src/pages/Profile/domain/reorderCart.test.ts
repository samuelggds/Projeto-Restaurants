import { describe, expect, it } from 'vitest';
import { buildReorderCart, findOrderByDisplayId } from './reorderCart';

describe('reorder cart', () => {
  it('converte os itens persistidos do pedido para a sacola', () => {
    expect(
      buildReorderCart({
        items: [
          {
            quantity: 2,
            price: '19.90',
            product: { id: 7, name: 'Pizza', image: 'pizza.jpg', stock: 4 },
          },
        ],
      }),
    ).toEqual([
      {
        productId: '7',
        name: 'Pizza',
        price: 19.9,
        quantity: 2,
        image: 'pizza.jpg',
        stock: 4,
      },
    ]);
  });

  it('ignora itens sem produto válido e localiza o pedido pelo identificador exibido', () => {
    expect(buildReorderCart({ items: [{ quantity: 1 }] })).toEqual([]);
    expect(findOrderByDisplayId([{ id: 52 }], '#0052')).toEqual({ id: 52 });
  });
});
