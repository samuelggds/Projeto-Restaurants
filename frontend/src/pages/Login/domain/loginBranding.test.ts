import { describe, expect, it } from 'vitest';
import { mapLoginBranding, resolveLoginRestaurant } from './loginBranding';

describe('identidade dinâmica do login', () => {
  it('resolve o restaurante pelo redirecionamento do cardápio', () => {
    expect(resolveLoginRestaurant(new URLSearchParams('next=/north-pizza'))).toEqual({
      restaurantId: null,
      slug: 'north-pizza',
    });
  });
  it('não interpreta rota privada como slug', () => {
    expect(resolveLoginRestaurant(new URLSearchParams('next=/profile'))).toEqual({
      restaurantId: null,
      slug: '',
    });
  });
  it('mapeia nome, descrição, logo e cor cadastrados', () => {
    expect(
      mapLoginBranding({
        primaryColor: '#123456',
        restaurant: {
          name: 'North Pizza',
          description: 'A melhor experiência em cada pedido',
          logo: 'https://cdn.test/logo.png',
        },
      }),
    ).toEqual({
      name: 'North Pizza',
      description: 'A melhor experiência em cada pedido',
      logoUrl: 'https://cdn.test/logo.png',
      primaryColor: '#123456',
    });
  });
  it('prioriza a capa de alta resolução sobre o logotipo', () => {
    expect(
      mapLoginBranding({
        restaurant: { logo: 'https://cdn.test/logo.png', coverImage: 'https://cdn.test/capa.webp' },
      }).logoUrl,
    ).toBe('https://cdn.test/capa.webp');
  });
});
