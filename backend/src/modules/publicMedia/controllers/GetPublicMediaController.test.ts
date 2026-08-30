// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import express from 'express';

import service from '../services/GetPublicMediaService.js';
import controller from './GetPublicMediaController.js';

const originals = {
  restaurantImage: service.restaurantImage,
  bannerImage: service.bannerImage,
};

afterEach(() => {
  service.restaurantImage = originals.restaurantImage;
  service.bannerImage = originals.bannerImage;
});

async function withServer(callback) {
  const app = express();
  app.get('/public-media/restaurants/:restaurantId/logo', (req, res) => controller.logo(req, res));
  app.get('/public-media/restaurants/:restaurantId/banners/:bannerId', (req, res) =>
    controller.banner(req, res),
  );
  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await callback(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('entrega a imagem binária com cache e permissão cross-origin', async () => {
  service.restaurantImage = async () => ({
    source: 'data:image/webp;base64,UklGRg==',
    updatedAt: new Date('2026-08-10T12:00:00.000Z'),
  });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public-media/restaurants/7/logo`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/webp');
    assert.match(response.headers.get('cache-control') || '', /max-age=86400/);
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal(Buffer.from(await response.arrayBuffer()).toString('ascii'), 'RIFF');
  });
});

test('mantém imagens externas como redirecionamentos sem buscar o conteúdo no servidor', async () => {
  service.restaurantImage = async () => ({
    source: 'https://cdn.example.com/logo.webp',
    updatedAt: new Date(),
  });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public-media/restaurants/7/logo`, {
      redirect: 'manual',
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://cdn.example.com/logo.webp');
  });
});

test('não expõe mídia quando os identificadores são inválidos', async () => {
  service.bannerImage = async () => {
    throw new Error('Banner inválido.');
  };

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public-media/restaurants/7/banners/x`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Banner inválido.' });
  });
});
