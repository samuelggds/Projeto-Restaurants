import assert from 'node:assert/strict';
import test from 'node:test';
import { probeDatabaseReadiness } from './readiness.js';

test('readiness confirma quando o banco responde', async () => {
  assert.deepEqual(await probeDatabaseReadiness(async () => 1, 50), { ready: true });
});

test('readiness fica indisponivel quando o banco falha', async () => {
  assert.deepEqual(
    await probeDatabaseReadiness(async () => {
      throw new Error('database unavailable');
    }, 50),
    { ready: false },
  );
});

test('readiness possui prazo maximo e nao prende o healthcheck', async () => {
  const startedAt = Date.now();
  const result = await probeDatabaseReadiness(() => new Promise(() => {}), 15);

  assert.deepEqual(result, { ready: false });
  assert.ok(Date.now() - startedAt < 250);
});
