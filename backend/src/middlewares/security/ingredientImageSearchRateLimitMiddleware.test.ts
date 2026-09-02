// @ts-nocheck
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';

import { createIngredientImageSearchRateLimit } from './ingredientImageSearchRateLimitMiddleware.js';

test('limita buscas por ator sem consumir a cota de outro restaurante', async (context) => {
  const app = express();
  app.use((req, _res, next) => {
    const restaurantId = Number(req.headers['x-test-restaurant']);
    req.user = { id: restaurantId, restaurantId, role: 'ADMIN' };
    next();
  });
  app.post(
    '/search',
    createIngredientImageSearchRateLimit({ windowMs: 60_000, max: 2 }),
    (_req, res) => res.sendStatus(204),
  );
  const server = app.listen(0);
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const search = (restaurantId) =>
    fetch(`http://127.0.0.1:${port}/search`, {
      method: 'POST',
      headers: { 'x-test-restaurant': String(restaurantId) },
    });

  assert.equal((await search(701)).status, 204);
  assert.equal((await search(701)).status, 204);
  const limited = await search(701);
  assert.equal(limited.status, 429);
  assert.match(JSON.stringify(await limited.json()), /Muitas buscas de imagem/);
  assert.equal((await search(702)).status, 204);
});
