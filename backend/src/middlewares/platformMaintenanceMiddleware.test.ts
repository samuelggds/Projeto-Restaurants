// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  createPlatformMaintenanceMiddleware,
  createPlatformStatusHandler,
  PlatformMaintenanceStateService,
  resolvePlatformSettingsCacheTtlMs,
} from './platformMaintenanceMiddleware.js';

async function withServer(app, callback) {
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('bloqueia negócio, mantém rotas essenciais e reutiliza cache curto', async () => {
  let loads = 0;
  const stateService = new PlatformMaintenanceStateService(async () => {
    loads += 1;
    return {
      maintenanceMode: true,
      maintenanceMessage: 'Atualização programada em andamento.',
    };
  }, 5_000);
  const app = express();
  app.use(
    createPlatformMaintenanceMiddleware(stateService, async (token) =>
      token === 'super-admin-token' ? 'SUPER_ADMIN' : null,
    ),
  );
  app.use((req, res) => res.status(200).json({ path: req.path }));

  await withServer(app, async (baseUrl) => {
    for (const [path, method] of [
      ['/health', 'GET'],
      ['/ready', 'GET'],
      ['/platform/status', 'GET'],
      ['/auth/login', 'POST'],
      ['/api/webhooks/asaas', 'POST'],
      ['/billing/webhook/mercadopago', 'POST'],
      ['/orders/webhook/stripe', 'POST'],
      ['/table-accounts/webhooks/fake', 'POST'],
    ]) {
      const response = await fetch(`${baseUrl}${path}`, { method });
      assert.equal(response.status, 200, `${method} ${path}`);
    }
    assert.equal(loads, 0);

    for (const path of [
      '/super-admin/dashboard',
      '/restaurants',
      '/ai-support/messages',
      '/billing/invoices/all',
    ]) {
      const superAdminRequest = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: 'Bearer super-admin-token' },
      });
      assert.equal(superAdminRequest.status, 200, path);
    }
    assert.equal(loads, 1);

    // O bypass é definido pela identidade autenticada, nunca por um prefixo
    // de URL que poderia ser explorado por outro papel.
    const pathOnlyBypass = await fetch(`${baseUrl}/super-admin/settings`, { method: 'PUT' });
    assert.equal(pathOnlyBypass.status, 503);

    const blocked = await fetch(`${baseUrl}/orders`);
    const repeated = await fetch(`${baseUrl}/restaurants`);
    const body = await blocked.json();

    assert.equal(blocked.status, 503);
    assert.equal(repeated.status, 503);
    assert.equal(blocked.headers.get('retry-after'), '60');
    assert.equal(body.code, 'PLATFORM_MAINTENANCE');
    assert.equal(body.error, 'Atualização programada em andamento.');
    assert.equal(loads, 1);
  });
});

test('falha de leitura abre a plataforma e também é cacheada', async () => {
  let loads = 0;
  const errors = [];
  const stateService = new PlatformMaintenanceStateService(
    async () => {
      loads += 1;
      throw new Error('database unavailable');
    },
    2_000,
    Date.now,
    (error) => errors.push(error),
  );
  const app = express();
  app.use(createPlatformMaintenanceMiddleware(stateService));
  app.get('/orders', (_req, res) => res.status(200).json({ ok: true }));

  await withServer(app, async (baseUrl) => {
    const first = await fetch(`${baseUrl}/orders`);
    const second = await fetch(`${baseUrl}/orders`);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(loads, 1);
    assert.equal(errors.length, 1);
  });
});

test('status público informa apenas disponibilidade e mensagem operacional', async () => {
  const app = express();
  app.get(
    '/platform/status',
    createPlatformStatusHandler({
      getState: async () => ({
        maintenanceMode: true,
        maintenanceMessage: 'Atualização programada.',
      }),
    }),
  );

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/platform/status`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {
      available: false,
      maintenanceMode: true,
      maintenanceMessage: 'Atualização programada.',
    });
  });
});

test('limita TTL configurável para manter alterações operacionais responsivas', () => {
  assert.equal(resolvePlatformSettingsCacheTtlMs('invalid'), 5_000);
  assert.equal(resolvePlatformSettingsCacheTtlMs(100), 1_000);
  assert.equal(resolvePlatformSettingsCacheTtlMs(90_000), 30_000);
});

test('invalidação durante leitura não deixa o estado antigo repopular o cache', async () => {
  let resolveFirstLoad;
  let loads = 0;
  const firstLoad = new Promise((resolve) => {
    resolveFirstLoad = resolve;
  });
  const stateService = new PlatformMaintenanceStateService(async () => {
    loads += 1;
    if (loads === 1) return firstLoad;
    return { maintenanceMode: true, maintenanceMessage: 'Estado atualizado.' };
  }, 5_000);

  const staleRequest = stateService.getState();
  stateService.invalidate();
  const freshRequest = stateService.getState();
  resolveFirstLoad({ maintenanceMode: false, maintenanceMessage: 'Estado antigo.' });

  assert.deepEqual(await staleRequest, {
    maintenanceMode: false,
    maintenanceMessage: 'Estado antigo.',
  });
  assert.deepEqual(await freshRequest, {
    maintenanceMode: true,
    maintenanceMessage: 'Estado atualizado.',
  });
  assert.deepEqual(await stateService.getState(), {
    maintenanceMode: true,
    maintenanceMessage: 'Estado atualizado.',
  });
  assert.equal(loads, 2);
});
