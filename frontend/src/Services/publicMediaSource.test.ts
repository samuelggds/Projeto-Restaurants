import { describe, expect, it } from 'vitest';
import {
  resolvePublicIngredientImages,
  resolvePublicMediaSource,
  resolvePublicProductImages,
} from './publicMediaSource';

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
      {
        id: 1,
        image: '/public-media/restaurants/3/products/1?v=1',
        optionGroups: [
          {
            id: 20,
            options: [
              {
                id: 30,
                ingredient: {
                  id: 9,
                  image: '/public-media/restaurants/3/ingredients/9?v=2',
                },
              },
              { id: 31, ingredient: { id: 10, image: null } },
            ],
          },
        ],
      },
      { id: 2, image: 'https://cdn.example.com/product.webp' },
    ];

    const resolved = resolvePublicProductImages(products, 'https://api.example.com');

    expect((resolved[0] as (typeof products)[0]).image).toBe(
      'https://api.example.com/public-media/restaurants/3/products/1?v=1',
    );
    expect(
      (resolved[0] as (typeof products)[0]).optionGroups?.[0].options[0].ingredient.image,
    ).toBe('https://api.example.com/public-media/restaurants/3/ingredients/9?v=2');
    expect(
      (resolved[0] as (typeof products)[0]).optionGroups?.[0].options[1].ingredient.image,
    ).toBe(null);
    expect((resolved[1] as (typeof products)[1]).image).toBe(
      'https://cdn.example.com/product.webp',
    );
    expect(products[0].image).toBe('/public-media/restaurants/3/products/1?v=1');
    expect(products[0].optionGroups[0].options[0].ingredient.image).toBe(
      '/public-media/restaurants/3/ingredients/9?v=2',
    );
  });

  it('normaliza imagens persistidas de ingredientes pela mesma origem da API', () => {
    const ingredients = [
      { id: 9, image: '/public-media/restaurants/3/ingredients/9?v=2' },
      { id: 10, image: null },
    ];

    expect(resolvePublicIngredientImages(ingredients, 'http://localhost:5173/api/')).toEqual([
      {
        id: 9,
        image: 'http://localhost:5173/api/public-media/restaurants/3/ingredients/9?v=2',
      },
      { id: 10, image: null },
    ]);
  });
});
