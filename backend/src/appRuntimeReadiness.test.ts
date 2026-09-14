import assert from 'node:assert/strict';
import test from 'node:test';

// This suite exercises the real middleware order without a database or providers.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/app_test';
process.env.DISTRIBUTED_STATE = 'memory';
const { default: app } = await import('./app.js');
const { default: prisma } = await import('./config/prisma.js');
const { platformMaintenanceStateService } =
  await import('./modules/platform/services/PlatformMaintenanceService.js');
const { registerRuntimeRealtimeProbe } = await import('./runtime/runtimeReadiness.js');

test('relay indisponível preserva status público e bloqueia readiness e negócio', async (t) => {
  const originalQueryRaw = prisma.$queryRaw;
  prisma.$queryRaw = (async () => [{ ready: 1 }]) as typeof prisma.$queryRaw;
  t.after(() => {
    prisma.$queryRaw = originalQueryRaw;
  });
  t.mock.method(platformMaintenanceStateService, 'getState', async () => ({
    maintenanceMode: true,
    maintenanceMessage: 'Atualização programada.',
  }));
  // Limiters stay in memory; only the readiness policy is switched for this test.
  process.env.DISTRIBUTED_STATE = 'postgres';
  registerRuntimeRealtimeProbe(() => false);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const status = await fetch(`${baseUrl}/platform/status`);
    assert.equal(status.status, 200);
    assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await status.json(), {
      available: false,
      maintenanceMode: true,
      maintenanceMessage: 'Atualização programada.',
    });
    const ready = await fetch(`${baseUrl}/ready`);
    assert.equal(ready.status, 503);
    const readiness = await ready.json();
    assert.equal(readiness.database, 'ok');
    assert.equal(readiness.realtime, 'unavailable');
    assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
    const business = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(business.status, 503);
    assert.deepEqual(await business.json(), {
      error: 'Serviço temporariamente indisponível. Tente novamente.',
    });
  } finally {
    process.env.DISTRIBUTED_STATE = 'memory';
    registerRuntimeRealtimeProbe(() => true);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await prisma.$disconnect();
  }
});
