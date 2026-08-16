import { describe, expect, it } from 'vitest';
import { addFavoriteToCart } from './favoriteCart';

const favorite = {
  id: '7',
  name: 'Pizza favorita',
  description: '',
  price: 39.9,
  image: 'pizza.jpg',
  rating: 5,
  stock: 2,
};

describe('addFavoriteToCart', () => {
  it('adiciona o favorito ao carrinho', () => {
    expect(addFavoriteToCart([], favorite).cart).toEqual([
      expect.objectContaining({ productId: '7', quantity: 1 }),
    ]);
  });

  it('respeita o estoque disponível', () => {
    const cart = [
      {
        productId: '7',
        name: 'Pizza favorita',
        price: 39.9,
        quantity: 2,
        image: 'pizza.jpg',
        stock: 2,
      },
    ];
    expect(addFavoriteToCart(cart, favorite).error).toBe('stockLimit');
  });
});
