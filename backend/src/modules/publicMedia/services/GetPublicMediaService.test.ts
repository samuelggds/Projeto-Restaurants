// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import repository from '../repositories/PublicMediaRepository.js';
import service from './GetPublicMediaService.js';

const originals = {
  findRestaurantImage: repository.findRestaurantImage,
  findBannerImage: repository.findBannerImage,
  findProductImage: repository.findProductImage,
  findIngredientImage: repository.findIngredientImage,
};

afterEach(() => {
  repository.findRestaurantImage = originals.findRestaurantImage;
  repository.findBannerImage = originals.findBannerImage;
  repository.findProductImage = originals.findProductImage;
  repository.findIngredientImage = originals.findIngredientImage;
});

test('busca somente a mídia do restaurante validado', async () => {
  const calls = [];
  repository.findRestaurantImage = async (...args) => {
    calls.push(args);
    return { logo: 'data:image/webp;base64,UklGRg==', updatedAt: new Date() };
  };

  const media = await service.restaurantImage('7', 'logo');

  assert.equal(media.source, 'data:image/webp;base64,UklGRg==');
  assert.deepEqual(calls, [[7, 'logo']]);
});

test('isola o banner pelo restaurante e rejeita mídia ausente', async () => {
  const calls = [];
  repository.findBannerImage = async (...args) => {
    calls.push(args);
    return null;
  };

  await assert.rejects(() => service.bannerImage(3, 9), /não encontrada/i);
  assert.deepEqual(calls, [[3, 9]]);
  await assert.rejects(() => service.bannerImage(3, '9x'), /Banner inválido/);
});

test('busca a imagem do produto dentro do restaurante informado', async () => {
  const calls = [];
  repository.findProductImage = async (...args) => {
    calls.push(args);
    return { image: 'https://cdn.example.com/produto.webp', updatedAt: new Date() };
  };

  const media = await service.productImage(3, 70);

  assert.equal(media.source, 'https://cdn.example.com/produto.webp');
  assert.deepEqual(calls, [[3, 70]]);
});

test('busca a imagem do ingrediente dentro do restaurante informado', async () => {
  const calls = [];
  repository.findIngredientImage = async (...args) => {
    calls.push(args);
    return { image: 'data:image/webp;base64,UklGRg==', updatedAt: new Date() };
  };

  const media = await service.ingredientImage(3, 12);

  assert.equal(media.source, 'data:image/webp;base64,UklGRg==');
  assert.deepEqual(calls, [[3, 12]]);
});
