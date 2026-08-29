// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import bannerRepository from '../repositories/BannerRepository.js';
import createBannerService from './CreateBannerService.js';
import deleteBannerService from './DeleteBannerService.js';
import listBannerService from './ListBannerService.js';
import updateBannerService from './UpdateBannerService.js';

const original = {
  create: bannerRepository.create,
  findAllByRestaurant: bannerRepository.findAllByRestaurant,
  findById: bannerRepository.findById,
  update: bannerRepository.update,
  delete: bannerRepository.delete,
};

afterEach(() => {
  bannerRepository.create = original.create;
  bannerRepository.findAllByRestaurant = original.findAllByRestaurant;
  bannerRepository.findById = original.findById;
  bannerRepository.update = original.update;
  bannerRepository.delete = original.delete;
});

test('normaliza e persiste todo o conteúdo promocional no restaurante autenticado', async () => {
  let captured = null;
  bannerRepository.create = async (data) => {
    captured = data;
    return { id: 1, ...data };
  };

  await createBannerService.execute({
    restaurantId: 8,
    title: '  Festival de pizzas  ',
    highlight: '  30% OFF  ',
    description: '  Somente neste fim de semana.  ',
    buttonLabel: '  Ver promoção  ',
    image: 'https://cdn.example.com/banner.webp',
    active: false,
    position: 3,
  });

  assert.deepEqual(captured, {
    restaurantId: 8,
    title: 'Festival de pizzas',
    highlight: '30% OFF',
    description: 'Somente neste fim de semana.',
    buttonLabel: 'Ver promoção',
    image: 'https://cdn.example.com/banner.webp',
    active: false,
    position: 3,
  });
});

test('aplica valores padrão seguros ao criar um banner', async () => {
  let captured = null;
  bannerRepository.create = async (data) => {
    captured = data;
    return { id: 1, ...data };
  };

  await createBannerService.execute({
    restaurantId: 8,
    title: 'Banner principal',
    image: 'https://cdn.example.com/banner.webp',
  });

  assert.deepEqual(captured, {
    restaurantId: 8,
    title: 'Banner principal',
    highlight: null,
    description: null,
    buttonLabel: 'Ver cardápio',
    image: 'https://cdn.example.com/banner.webp',
    active: true,
    position: 0,
  });
});

test('valida limites de texto, ativação e posição antes de persistir', async () => {
  const base = {
    restaurantId: 8,
    title: 'Banner principal',
    image: 'https://cdn.example.com/banner.webp',
  };

  await assert.rejects(
    () => createBannerService.execute({ ...base, title: 'x'.repeat(81) }),
    /80 caracteres/,
  );
  await assert.rejects(
    () => createBannerService.execute({ ...base, highlight: 'x'.repeat(51) }),
    /50 caracteres/,
  );
  await assert.rejects(
    () => createBannerService.execute({ ...base, description: 'x'.repeat(181) }),
    /180 caracteres/,
  );
  await assert.rejects(
    () => createBannerService.execute({ ...base, buttonLabel: 'x'.repeat(31) }),
    /30 caracteres/,
  );
  await assert.rejects(
    () => createBannerService.execute({ ...base, active: 'true' }),
    /verdadeiro ou falso/,
  );
  await assert.rejects(
    () => createBannerService.execute({ ...base, position: -1 }),
    /maior ou igual a zero/,
  );
  await assert.rejects(
    () => createBannerService.execute({ ...base, position: 1.5 }),
    /número inteiro/,
  );
});

test('atualiza somente os campos enviados e permite ocultar textos opcionais', async () => {
  let captured = null;
  bannerRepository.findById = async () => ({ id: 1, restaurantId: 8 });
  bannerRepository.update = async (_id, _restaurantId, data) => {
    captured = data;
    return { id: 1, restaurantId: 8, ...data };
  };

  await updateBannerService.execute({
    id: 1,
    restaurantId: 8,
    highlight: '  ',
    description: '  Pizza em dobro  ',
    buttonLabel: null,
    active: false,
    position: 4,
  });

  assert.deepEqual(captured, {
    highlight: null,
    description: 'Pizza em dobro',
    buttonLabel: null,
    active: false,
    position: 4,
  });
});

test('lista exclusivamente os banners do restaurante autenticado', async () => {
  bannerRepository.findAllByRestaurant = async (restaurantId) => {
    assert.equal(restaurantId, 8);
    return [
      { id: 2, position: 0 },
      { id: 5, position: 1 },
    ];
  };

  assert.deepEqual(await listBannerService.execute({ restaurantId: 8 }), [
    { id: 2, position: 0 },
    { id: 5, position: 1 },
  ]);
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

test('não permite atualizar ou excluir um banner pertencente a outro restaurante', async () => {
  const lookups: Array<[number, number]> = [];
  let updateCalled = false;
  let deleteCalled = false;
  bannerRepository.findById = async (id, restaurantId) => {
    lookups.push([Number(id), Number(restaurantId)]);
    return null;
  };
  bannerRepository.update = async () => {
    updateCalled = true;
    return null;
  };
  bannerRepository.delete = async () => {
    deleteCalled = true;
    return { count: 0 };
  };

  await assert.rejects(
    () =>
      updateBannerService.execute({
        id: 77,
        restaurantId: 8,
        title: 'Tentativa indevida',
      }),
    /Banner não encontrado/,
  );
  await assert.rejects(
    () => deleteBannerService.execute({ id: 77, restaurantId: 8 }),
    /Banner não encontrado/,
  );

  assert.deepEqual(lookups, [
    [77, 8],
    [77, 8],
  ]);
  assert.equal(updateCalled, false);
  assert.equal(deleteCalled, false);
});
