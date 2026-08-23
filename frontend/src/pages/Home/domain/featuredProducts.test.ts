import { describe, expect, it } from 'vitest';
import type { HomeProduct } from '../types';
import { getFeaturedProducts } from './featuredProducts';

const product = (overrides: Partial<HomeProduct>): HomeProduct => ({
  id: 'produto',
  categoryId: 'categoria',
  name: 'Produto',
  description: 'Descrição',
  price: 20,
  originalPrice: 25,
  image: '/produto.jpg',
  rating: 0,
  available: true,
  promotion: {
    active: true,
    discountAmount: 5,
    discountPercentage: 20,
    badgeLabel: '20% de desconto',
  },
  ...overrides,
});

describe('produtos em oferta na Home', () => {
  it('mantém somente descontos ativos, positivos e disponíveis na ordem do cardápio', () => {
    const featured = getFeaturedProducts([
      product({ id: 'oferta-1' }),
      product({ id: 'indisponivel', available: false }),
      product({
        id: 'sem-desconto',
        promotion: {
          active: true,
          discountAmount: 0,
          discountPercentage: 0,
          badgeLabel: 'Oferta',
        },
      }),
      product({
        id: 'inativo',
        promotion: {
          active: false,
          discountAmount: 5,
          discountPercentage: 20,
          badgeLabel: 'Oferta',
        },
      }),
      product({ id: 'oferta-2' }),
    ]);

    expect(featured.map(({ id }) => id)).toEqual(['oferta-1', 'oferta-2']);
  });
});
