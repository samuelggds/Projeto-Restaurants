import { describe, expect, it } from 'vitest';
import {
  buildProfileRestaurantHomePath,
  buildProfileRestaurantMenuPath,
} from './profileRestaurantNavigation';

describe('profileRestaurantNavigation', () => {
  it('usa o slug das configurações públicas para voltar ao restaurante correto', () => {
    expect(
      buildProfileRestaurantHomePath(
        { restaurant: { slug: 'North-Pizza' } },
        { restaurantId: 42 },
      ),
    ).toBe('/north-pizza');
  });

  it('usa o slug da conta como fallback enquanto as configurações carregam', () => {
    expect(
      buildProfileRestaurantHomePath(null, { restaurant: { slug: 'north-pizza' } }),
    ).toBe('/north-pizza');
  });

  it('aponta o cardápio para a seção do restaurante atual', () => {
    expect(buildProfileRestaurantMenuPath('/north-pizza')).toBe('/north-pizza#cardapio');
  });
});
