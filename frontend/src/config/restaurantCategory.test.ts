import { describe, expect, it } from 'vitest';
import {
  getAuthHeroCopy,
  getRestaurantLoginVisual,
  RESTAURANT_CATEGORIES,
} from './restaurantCategory';

describe('apresentação do login por categoria', () => {
  it.each(RESTAURANT_CATEGORIES)('oferece identidade visual válida para %s', (category) => {
    const visual = getRestaurantLoginVisual(category);

    expect(visual.category).toBe(category);
    expect(visual.accent).toMatch(/^#[0-9a-f]{6}$/iu);
    expect(visual.deep).toMatch(/^#[0-9a-f]{6}$/iu);
    expect(getAuthHeroCopy(category, 'login').headline).not.toHaveLength(0);
    expect(getAuthHeroCopy(category, 'login').support).not.toHaveLength(0);
  });

  it('usa a apresentação neutra quando recebe uma categoria desconhecida', () => {
    expect(getRestaurantLoginVisual('categoria-inexistente').category).toBe('RESTAURANTE');
  });
});
