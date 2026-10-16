import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import {
  privateApiCacheMiddleware,
  shouldPreventHttpCaching,
} from './privateApiCacheMiddleware.js';

test('cache privado usa prefixos completos e respeita recursos publicos', () => {
  assert.equal(shouldPreventHttpCaching('/orders/123', false), true);
  assert.equal(shouldPreventHttpCaching('/ORDERS/123', false), true);
  assert.equal(shouldPreventHttpCaching('/table-accounts/7', false), true);
  assert.equal(shouldPreventHttpCaching('/admin-portal/restaurant', false), true);
  assert.equal(shouldPreventHttpCaching('/orders-public', false), false);
  assert.equal(shouldPreventHttpCaching('/products?restaurantId=7', false), false);
  assert.equal(shouldPreventHttpCaching('/products', true), true);
});

test('respostas de pedidos nao sao armazenadas, sem impedir cache de catalogo publico', async () => {
  const app = express();
  app.use(privateApiCacheMiddleware);
  app.get('/orders/:id', (_req, res) => res.json({ id: 123, paid: true }));
  app.get('/products', (_req, res) => res.json({ products: [] }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const origin = `http://127.0.0.1:${port}`;
    const order = await fetch(`${origin}/orders/123`);
    assert.equal(order.status, 200);
    assert.equal(order.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(await order.json(), { id: 123, paid: true });

    const publicProducts = await fetch(`${origin}/products`);
    assert.equal(publicProducts.headers.get('cache-control'), null);
    assert.equal(publicProducts.status, 200);

    const authenticatedProducts = await fetch(`${origin}/products`, {
      headers: { Authorization: 'Bearer test-credential' },
    });
    assert.equal(authenticatedProducts.headers.get('cache-control'), 'private, no-store');
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
