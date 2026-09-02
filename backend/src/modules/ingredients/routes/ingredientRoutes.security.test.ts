// @ts-nocheck
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';

import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import ingredientRoutes from './ingredientRoutes.js';

test('busca de imagens exige autenticação', async (context) => {
  const app = express();
  app.use(express.json());
  app.use('/ingredients', ingredientRoutes);
  const server = app.listen(0);
  context.after(() => server.close());
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;

  const response = await fetch(`http://127.0.0.1:${port}/ingredients/image-search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Bacon' }),
  });

  assert.equal(response.status, 401);
  assert.match(JSON.stringify(await response.json()), /Token não informado/);
});

test('middleware administrativo recusa usuário de outro papel', () => {
  let nextCalled = false;
  const response = {
    statusCode: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
  adminMiddleware({ user: { role: 'FUNCIONARIO', restaurantId: 8 } }, response, () => {
    nextCalled = true;
  });

  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});
