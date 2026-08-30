import { describe, expect, it } from 'vitest';
import { resolvePublicMediaSource, resolvePublicProductImages } from './publicMediaSource';

describe('publicMediaSource', () => {
  it('resolve mídia relativa pela origem que respondeu à API', () => {
    expect(
      resolvePublicMediaSource(
        '/public-media/restaurants/3/products/70?v=1',
        'http://localhost:5173/api/',
      ),
    ).toBe('http://localhost:5173/api/public-media/restaurants/3/products/70?v=1');
  });

  it('mantém URLs externas e normaliza imagens de produtos sem mutar a resposta', () => {
    const products = [
      { id: 1, image: '/public-media/restaurants/3/products/1?v=1' },
      { id: 2, image: 'https://cdn.example.com/product.webp' },
    ];

    const resolved = resolvePublicProductImages(products, 'https://api.example.com');

    expect(resolved).toEqual([
      { id: 1, image: 'https://api.example.com/public-media/restaurants/3/products/1?v=1' },
      { id: 2, image: 'https://cdn.example.com/product.webp' },
    ]);
    expect(products[0].image).toBe('/public-media/restaurants/3/products/1?v=1');
  });
});
