import { describe, expect, it } from 'vitest';
import { resolveComboCategoryImage } from './FigmaDeliveryExperience';
import type { HomeCategory, HomeProduct } from './types';

const combo = {
  id: '90',
  categoryId: 'Combos',
  name: 'Combo da Casa',
  description: '',
  price: 39.9,
  originalPrice: 39.9,
  image: 'produto-combo.webp',
  rating: 0,
  available: true,
  kind: 'COMBO',
} satisfies HomeProduct;

describe('resolveComboCategoryImage', () => {
  it('prioriza a foto da categoria Combos configurada pelo admin', () => {
    const categories: HomeCategory[] = [
      { id: 'Combos', name: 'Combos', image: 'categoria-combos.webp' },
    ];

    expect(resolveComboCategoryImage(categories, [combo])).toBe('categoria-combos.webp');
  });

  it('usa a foto do primeiro combo somente quando a categoria não possui foto', () => {
    const categories: HomeCategory[] = [{ id: 'Combos', name: 'Combos', image: '' }];

    expect(resolveComboCategoryImage(categories, [combo])).toBe('produto-combo.webp');
  });
});
