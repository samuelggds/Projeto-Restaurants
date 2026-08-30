// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import express from 'express';

import service from '../services/GetPublicRestaurantSettingsRevisionService.js';
import controller from './GetPublicRestaurantSettingsRevisionController.js';

const originalExecute = service.execute;

afterEach(() => {
  service.execute = originalExecute;
});

async function withServer(callback) {
  const app = express();
  app.get('/public/default/revision', (req, res) => controller.handle(req, res));
  app.get('/public/slug/:slug/revision', (req, res) => controller.handle(req, res));
  app.get('/public/:restaurantId/revision', (req, res) => controller.handle(req, res));

  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await callback(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('retorna somente restaurantId e revision com cache condicional', async () => {
  service.execute = async () => ({ restaurantId: 7, revision: 'v1-token' });

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public/7/revision`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('etag'), '"v1-token"');
    assert.deepEqual(await response.json(), { restaurantId: 7, revision: 'v1-token' });

    const unchanged = await fetch(`${baseUrl}/public/7/revision`, {
      headers: { 'If-None-Match': '"v1-token"' },
    });
    assert.equal(unchanged.status, 304);
    assert.equal(await unchanged.text(), '');
  });
});

test('encaminha corretamente os seletores slug e default ao serviço', async () => {
  const payloads = [];
  service.execute = async (payload) => {
    payloads.push(payload);
    return { restaurantId: payload.slug ? 9 : 1, revision: 'v1-token' };
  };

  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/public/slug/pizza-sul/revision`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/public/default/revision`)).status, 200);
  });

  assert.deepEqual(payloads, [
    { restaurantId: undefined, slug: 'pizza-sul', useDefault: false },
    { restaurantId: undefined, slug: undefined, useDefault: true },
  ]);
});

test('responde 400 quando o seletor público é inválido', async () => {
  service.execute = async () => {
    throw new Error('Restaurante inválido.');
  };

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/public/invalido/revision`);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'Restaurante inválido.' });
  });
});
