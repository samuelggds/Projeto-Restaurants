import assert from 'node:assert/strict';
import test from 'node:test';
import { createCachedDatabaseReadiness, probeDatabaseReadiness } from './readiness.js';

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

test('rajada pública compartilha uma consulta e volta a sondar após expirar o snapshot', async () => {
  let queries = 0;
  let currentTime = 0;
  let release: (result: { ready: boolean }) => void;
  const cachedProbe = createCachedDatabaseReadiness(
    () => {
      queries += 1;
      return new Promise((resolve) => {
        release = resolve;
      });
    },
    1000,
    () => currentTime,
  );
  const burst = Array.from({ length: 100 }, () => cachedProbe());
  await Promise.resolve();
  assert.equal(queries, 1);
  release({ ready: true });
  assert.ok((await Promise.all(burst)).every((result) => result.ready));
  currentTime = 999;
  assert.deepEqual(await cachedProbe(), { ready: true });
  assert.equal(queries, 1);
  currentTime = 1000;
  const next = cachedProbe();
  await Promise.resolve();
  release({ ready: false });
  assert.deepEqual(await next, { ready: false });
  assert.equal(queries, 2);
});

test('falha compartilhada não prende futuras sondagens nem fica eternamente pronta', async () => {
  let queries = 0;
  let currentTime = 0;
  const cachedProbe = createCachedDatabaseReadiness(
    async () => {
      queries += 1;
      if (queries === 1) throw new Error('offline');
      return { ready: true };
    },
    1000,
    () => currentTime,
  );
  assert.deepEqual(await cachedProbe(), { ready: false });
  assert.deepEqual(await cachedProbe(), { ready: false });
  currentTime = 1000;
  assert.deepEqual(await cachedProbe(), { ready: true });
  assert.equal(queries, 2);
});
