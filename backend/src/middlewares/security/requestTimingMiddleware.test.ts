import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import express from 'express';
import { requestIdMiddleware } from './requestIdMiddleware.js';
import {
  requestTimingMiddleware,
  resolveSlowRequestThresholdMs,
} from './requestTimingMiddleware.js';

test('limite de lentidao e seguro para configuracao invalida', () => {
  assert.equal(resolveSlowRequestThresholdMs('2500'), 2500);
  assert.equal(resolveSlowRequestThresholdMs('50'), 2000);
  assert.equal(resolveSlowRequestThresholdMs('NaN'), 2000);
});

test('falhas sao registradas com rota parametrizada e sem parametros sensiveis', async () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(requestTimingMiddleware);
  app.get('/orders/:id', (_req, res) => res.status(503).json({ error: 'indisponivel' }));
  app.use((_req, res) => res.status(503).json({ error: 'rota inexistente' }));

  const entries: unknown[][] = [];
  const previousWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    entries.push(args);
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  try {
    const port = (server.address() as AddressInfo).port;
    const response = await fetch(
      `http://127.0.0.1:${port}/orders/private-order-123?token=secret`,
    );
    assert.equal(response.status, 503);
    assert.ok(response.headers.get('x-request-id'));
    assert.equal(entries.length, 1);
    assert.equal(entries[0][0], '[API_REQUEST_TIMING]');
    const detail = entries[0][1] as Record<string, unknown>;
    assert.equal(detail.path, '/orders/:id');
    assert.equal(detail.statusCode, 503);
    assert.equal(typeof detail.durationMs, 'number');
    assert.equal(detail.requestId, response.headers.get('x-request-id'));
    assert.equal(JSON.stringify(detail).includes('private-order-123'), false);
    assert.equal(JSON.stringify(detail).includes('secret'), false);

    const unknown = await fetch(
      `http://127.0.0.1:${port}/unknown/customer%40example.com?token=secret`,
    );
    assert.equal(unknown.status, 503);
    assert.equal(entries.length, 2);
    const unknownDetail = entries[1][1] as Record<string, unknown>;
    assert.equal(unknownDetail.path, '/[unmatched]');
    assert.equal(JSON.stringify(unknownDetail).includes('customer'), false);
    assert.equal(JSON.stringify(unknownDetail).includes('secret'), false);
  } finally {
    console.warn = previousWarn;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
