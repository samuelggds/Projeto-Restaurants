// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import bannerRepository from '../repositories/BannerRepository.js';
import createBannerService from './CreateBannerService.js';
import updateBannerService from './UpdateBannerService.js';

const original = {
  create: bannerRepository.create,
  findById: bannerRepository.findById,
  update: bannerRepository.update,
};

afterEach(() => {
  bannerRepository.create = original.create;
  bannerRepository.findById = original.findById;
  bannerRepository.update = original.update;
});

test('normaliza e persiste banner válido no restaurante autenticado', async () => {
  let captured = null;
  bannerRepository.create = async (data) => {
    captured = data;
    return { id: 1, ...data };
  };

  await createBannerService.execute({
    restaurantId: 8,
    title: '  Banner principal  ',
    image: 'https://cdn.example.com/banner.webp',
  });

  assert.deepEqual(captured, {
    restaurantId: 8,
    title: 'Banner principal',
    image: 'https://cdn.example.com/banner.webp',
  });
});

test('rejeita imagem temporária ao criar ou atualizar banner', async () => {
  await assert.rejects(
    () =>
      createBannerService.execute({
        restaurantId: 8,
        title: 'Banner principal',
        image: 'blob:http://localhost/banner',
      }),
    /temporária/,
  );

  bannerRepository.findById = async () => ({ id: 1, restaurantId: 8 });
  await assert.rejects(
    () =>
      updateBannerService.execute({
        id: 1,
        restaurantId: 8,
        image: 'imagem-inválida',
      }),
    /inválido/,
  );
});
