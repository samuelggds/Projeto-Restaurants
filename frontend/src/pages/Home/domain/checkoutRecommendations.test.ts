import { describe, expect, it } from 'vitest';
import type { HomeProduct } from '../types';
import { checkoutRecommendations, getCheckoutRecommendationGroup } from './homePageHelpers';

const makeProduct = (id: string, categoryId: string, overrides: Partial<HomeProduct> = {}): HomeProduct => ({
  id,
  categoryId,
  name: 'Produto ' + id,
  description: '',
  price: 12,
  originalPrice: 12,
  image: '',
  rating: 0,
  available: true,
  ...overrides,
});

describe('recomendações seguras do checkout', () => {
  it('organiza acompanhamentos, bebidas, sobremesas e demais itens', () => {
    const products = [
      makeProduct('lanche', 'Hambúrgueres'),
      makeProduct('doce', 'Sobremesas'),
      makeProduct('suco', 'Bebidas'),
      makeProduct('batata', 'Porções'),
      makeProduct('molho', 'Adicionais'),
    ];
    expect(checkoutRecommendations(products, []).map((product) => product.id)).toEqual([
      'batata', 'suco', 'doce', 'molho', 'lanche',
    ]);
    expect(getCheckoutRecommendationGroup(makeProduct('a', 'Açaí'))).toBe('desserts');
    expect(getCheckoutRecommendationGroup(makeProduct('b', 'Água'))).toBe('drinks');
  });

  it('ignora itens no carrinho, indisponíveis, sem estoque, com preço inválido e duplicados', () => {
    const items = [
      makeProduct('cart', 'Bebidas'),
      makeProduct('inactive', 'Bebidas', { available: false }),
      makeProduct('out', 'Acompanhamentos', { stock: 0 }),
      makeProduct('free', 'Sobremesas', { price: 0 }),
      makeProduct('invalid', 'Bebidas', { price: Number.NaN }),
      makeProduct('valid', 'Bebidas'),
      makeProduct('valid', 'Bebidas'),
    ];
    const cart = [{ productId: 'cart', name: 'Produto cart', price: 12, quantity: 1, image: '' }];
    expect(checkoutRecommendations(items, cart).map((product) => product.id)).toEqual(['valid']);
  });

  it('limita cada grupo em 12 itens sem esconder outra categoria', () => {
    const sides = Array.from({ length: 15 }, (_, i) => makeProduct(String(i), 'Acompanhamentos'));
    const result = checkoutRecommendations([...sides, makeProduct('drink', 'Bebidas')], []);
    expect(result).toHaveLength(13);
    expect(result.some((product) => product.id === 'drink')).toBe(true);
  });
});
