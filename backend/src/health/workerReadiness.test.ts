import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { type TestContext } from 'node:test';
import { createWorkerReadinessServer } from './workerReadiness.js';

async function serve(t: TestContext, options: Parameters<typeof createWorkerReadinessServer>[0]) {
  const server = createWorkerReadinessServer(options);
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  assert.equal(address.address, '127.0.0.1');
  return `http://127.0.0.1:${address.port}`;
}

test('worker só fica pronto com runtime e banco disponíveis', async (t) => {
  let runtimeReady = false;
  let databaseReady = false;
  let probes = 0;
  const url = await serve(t, {
    runtimeReady: () => runtimeReady,
    databaseReady: async () => {
      probes += 1;
      return { ready: databaseReady };
    },
  });
  assert.equal((await fetch(`${url}/ready`)).status, 503);
  assert.equal(probes, 0);
  runtimeReady = true;
  assert.equal((await fetch(`${url}/ready`)).status, 503);
  databaseReady = true;
  const ready = await fetch(`${url}/ready`);
  assert.equal(ready.status, 200);
  assert.equal(ready.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await ready.json(), { ready: true });
  runtimeReady = false;
  assert.equal((await fetch(`${url}/ready`)).status, 503);
});

test('shutdown durante a sondagem não produz readiness positiva', async (t) => {
  let runtimeReady = true;
  const url = await serve(t, {
    runtimeReady: () => runtimeReady,
    databaseReady: async () => {
      runtimeReady = false;
      return { ready: true };
    },
  });
  assert.equal((await fetch(`${url}/ready`)).status, 503);
});

test('erro no probe não expõe diagnóstico nem credencial', async (t) => {
  const url = await serve(t, {
    runtimeReady: () => true,
    databaseReady: async () => {
      throw new Error('private database diagnostic');
    },
  });
  const response = await fetch(`${url}/ready`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ready: false });
});

test('rotas e métodos desconhecidos não consultam banco', async (t) => {
  const url = await serve(t, {
    runtimeReady: () => true,
    databaseReady: async () => {
      assert.fail('unexpected probe');
    },
  });
  assert.equal((await fetch(`${url}/health`)).status, 404);
  assert.equal((await fetch(`${url}/ready`, { method: 'POST' })).status, 404);
});
