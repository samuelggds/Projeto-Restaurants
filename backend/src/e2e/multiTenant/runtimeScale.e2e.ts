import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { availableParallelism, totalmem, platform, arch } from 'node:os';
import { writeFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import type { Options } from 'express-rate-limit';
import {
  apiRequest,
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  connectTenantSocket,
  waitForSocketEvent,
  expectNoSocketEvent,
} from './tenantE2EHarness.js';
import { startRuntimeTestProcess } from '../runtime/runtimeTestProcess.js';
import { PostgresRateLimitStore } from '../../middlewares/security/PostgresRateLimitStore.js';
import authTokenService from '../../modules/auth/services/AuthTokenService.js';
import { PostgresRealtimeTransport } from '../../realtime/postgresRealtimeTransport.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test(
  'duas APIs: rate limit compartilhado, eventos e isolamento real',
  { timeout: 90_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    await t.test('relay volta após falha de escrita sem depender de nova requisição', async () => {
      let rejectWrites = true;
      const emitted: string[] = [];
      const emitter = {
        emit: (event: string) => {
          emitted.push(event);
        },
        to: () => emitter,
      };
      const db = {
        $queryRaw: runtimePrisma.$queryRaw.bind(runtimePrisma),
        $executeRaw: (...args: Parameters<typeof runtimePrisma.$executeRaw>) => {
          if (rejectWrites) return Promise.reject(new Error('synthetic write outage'));
          return runtimePrisma.$executeRaw(...args);
        },
      };
      const relay = new PostgresRealtimeTransport(emitter, db);
      await relay.start();
      try {
        await relay.emit('synthetic-before-recovery', {});
        assert.equal(relay.healthy(), false);
        // Recover via the scheduled INSERT probe, using the real restricted role.
        rejectWrites = false;
        const deadline = Date.now() + 7_000;
        while (!relay.healthy() && Date.now() < deadline) await pause(50);
        assert.equal(relay.healthy(), true);
        await relay.emit('synthetic-after-recovery', {});
        await relay.poll();
        assert.ok(emitted.includes('synthetic-after-recovery'));
        assert.ok(!emitted.includes('__runtime_write_probe__'));
      } finally {
        await relay.stop();
      }
    });
    await t.test('incrementos atômicos, expiração e separação por finalidade', async () => {
      const stores = [
        new PostgresRateLimitStore('test-atomic'),
        new PostgresRateLimitStore('test-atomic'),
      ];
      stores.forEach((store) => store.init({ windowMs: 60_000 } as Options));
      const results = await Promise.all(
        Array.from({ length: 40 }, (_, i) => stores[i % 2].increment('synthetic-client')),
      );
      assert.deepEqual(
        results.map((row) => row.totalHits).sort((a, b) => a - b),
        Array.from({ length: 40 }, (_, i) => i + 1),
      );
      assert.equal(
        (await new PostgresRateLimitStore('test-other').increment('synthetic-client')).totalHits,
        1,
      );
      await prisma.$executeRaw`UPDATE "RuntimeRateLimit" SET "resetTime" = clock_timestamp() - INTERVAL '1 second' WHERE "key" LIKE 'test-atomic:%'`;
      assert.equal((await stores[0].increment('synthetic-client')).totalHits, 1);
      await stores[1].decrement('synthetic-client');
      assert.equal((await stores[0].increment('synthetic-client')).totalHits, 1);
      const rows = await prisma.$queryRaw<
        Array<{ key: string }>
      >`SELECT "key" FROM "RuntimeRateLimit"`;
      assert.ok(rows.every((row) => !row.key.includes('synthetic-client')));
    });
    const a = await startRuntimeTestProcess();
    let b: Awaited<ReturnType<typeof startRuntimeTestProcess>> | undefined;
    try {
      b = await startRuntimeTestProcess();
      assert.notEqual(a.pid, b.pid);
      const peer = b;
      await t.test('alternar réplicas não reinicia o limite HTTP', async () => {
        const statuses = [];
        for (const instance of [a, peer, a, peer])
          statuses.push((await fetch(`${instance.baseUrl}/__runtime/rate`)).status);
        assert.deepEqual(statuses, [200, 200, 200, 429]);
        for (const instance of [a, peer])
          assert.equal((await fetch(`${instance.baseUrl}/ready`)).status, 200);
      });
      await t.test('publicação em uma API chega à outra sem atravessar o tenant', async () => {
        const authorized = await connectTenantSocket(peer.baseUrl, fixture.tokens.adminA);
        const outsider = await connectTenantSocket(peer.baseUrl, fixture.tokens.adminB);
        try {
          const received = waitForSocketEvent<Record<string, unknown>>(
            authorized,
            'runtime-probe',
            5_000,
          );
          const privateRoom = expectNoSocketEvent(outsider, 'runtime-probe', 1_000);
          a.publish(`restaurant:${fixture.restaurants.a.id}`, 'runtime-probe', {
            id: fixture.orders.a.id,
            restaurantId: fixture.restaurants.a.id,
            creationRequestKey: 'internal-must-not-leak',
            paymentConfirmationPin: 'hash-must-not-leak',
          });
          const payload = await received;
          assert.equal(payload.id, fixture.orders.a.id);
          assert.equal(payload.creationRequestKey, undefined);
          assert.equal(payload.paymentConfirmationPin, undefined);
          await privateRoom;
        } finally {
          authorized.disconnect();
          outsider.disconnect();
        }
      });
      await t.test('repetição simultânea nas duas APIs cria um único pedido', async () => {
        const payload = {
          restaurantId: fixture.restaurants.a.id,
          type: 'RETIRADA',
          paymentMethod: 'DINHEIRO',
          items: [{ productId: fixture.products.a.id, quantity: 1 }],
        };
        const key = randomUUID();
        const results = await Promise.all(
          [a, peer].map((instance) =>
            apiRequest(instance.baseUrl, '/orders', fixture.tokens.adminA, {
              method: 'POST',
              json: payload,
              headers: { 'Idempotency-Key': key },
              signal: AbortSignal.timeout(15_000),
            }),
          ),
        );
        for (const result of results)
          assert.equal(result.response.status, 201, JSON.stringify(result.data));
        assert.equal(results[0].data.id, results[1].data.id);
        assert.equal(await prisma.order.count({ where: { id: results[0].data.id } }), 1);
      });
    } finally {
      await b?.close();
      await a.close();
    }
  },
);

const percentile = (values: number[], percent: number) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return Math.round(sorted[Math.max(0, Math.ceil(sorted.length * percent) - 1)] || 0);
};

test(
  'carga aberta: 120 restaurantes, 600 pedidos/min e 1200 leituras/min',
  {
    skip: process.env.TENANT_E2E_SCALE_LOAD !== 'true',
    timeout: 240_000,
  },
  async () => {
    await resetTenantE2EDatabase();
    const seed = await seedTenantE2EFixture();
    // Reuse only a synthetic password hash. No provider credentials are copied.
    const tenants = [];
    for (let i = 0; i < 120; i++) {
      const restaurant = await prisma.restaurant.create({
        data: {
          name: `Load ${i}`,
          slug: `load-${i}`,
          email: `load-${i}@tenant-e2e.test`,
          active: true,
        },
      });
      await prisma.subscription.create({
        data: {
          restaurantId: restaurant.id,
          plan: 'PREMIUM',
          status: 'ATIVA',
          currentPeriodStart: new Date(Date.now() - 86_400_000),
          currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
        },
      });
      await prisma.restaurantSettings.create({
        data: { restaurantId: restaurant.id, soundNotifications: false },
      });
      const user = await prisma.user.create({
        data: {
          restaurantId: restaurant.id,
          name: `Admin ${i}`,
          email: `load-admin-${i}@tenant-e2e.test`,
          password: seed.users.adminA.password,
          role: 'ADMIN',
          active: true,
        },
      });
      const category = await prisma.category.create({
        data: { name: 'Load', restaurantId: restaurant.id },
      });
      const product = await prisma.product.create({
        data: {
          name: 'Produto de teste',
          price: 25,
          stock: 1000,
          active: true,
          saleMode: 'COMPLETE',
          restaurantId: restaurant.id,
          categoryId: category.id,
        },
      });
      tenants.push({
        id: restaurant.id,
        productId: product.id,
        token: authTokenService.createAccessToken(user),
      });
    }
    const a = await startRuntimeTestProcess();
    let b: Awaited<ReturnType<typeof startRuntimeTestProcess>> | undefined;
    const sockets: Awaited<ReturnType<typeof connectTenantSocket>>[] = [];
    const errors: string[] = [];
    const orderLatencies: number[] = [],
      readLatencies: number[] = [],
      dispatchLag: number[] = [];
    const ids = new Set<number>();
    const seenEvents = new Set<number>();
    const receivedAt = new Map<number, number>();
    const createdAt = new Map<number, number>();
    try {
      b = await startRuntimeTestProcess();
      const replicas = [a, b];
      for (let i = 0; i < tenants.length; i++) {
        const tenant = tenants[i];
        const socket = await connectTenantSocket(replicas[(i + 1) % 2].baseUrl, tenant.token);
        socket.on('new-order', (order: { id: number; restaurantId: number }) => {
          if (order.restaurantId !== tenant.id)
            errors.push(`Evento atravessou tenant ${tenant.id}`);
          seenEvents.add(order.id);
          if (!receivedAt.has(order.id)) receivedAt.set(order.id, performance.now());
        });
        sockets.push(socket);
      }
      const pending = new Set<Promise<void>>();
      const submit = (operation: Promise<void>) => {
        const work = operation
          .catch((error) => errors.push(error instanceof Error ? error.message : String(error)))
          .then(() => undefined);
        pending.add(work);
        void work.finally(() => pending.delete(work));
      };
      const request = async (index: number, create: boolean) => {
        const tenant = tenants[index % 120];
        const started = performance.now();
        const result = await apiRequest(
          replicas[index % 2].baseUrl,
          create ? '/orders' : '/orders?queue=ACTIVE&limit=25',
          tenant.token,
          create
            ? {
                method: 'POST',
                json: {
                  restaurantId: tenant.id,
                  type: 'RETIRADA',
                  paymentMethod: 'DINHEIRO',
                  items: [{ productId: tenant.productId, quantity: 1 }],
                },
                headers: { 'Idempotency-Key': randomUUID() },
                signal: AbortSignal.timeout(15_000),
              }
            : { signal: AbortSignal.timeout(15_000) },
        );
        (create ? orderLatencies : readLatencies).push(performance.now() - started);
        if (result.response.status !== (create ? 201 : 200)) {
          errors.push(
            `${create ? 'POST' : 'GET'} ${result.response.status}: ${JSON.stringify(result.data).slice(0, 300)}`,
          );
          return;
        }
        if (create) {
          ids.add(result.data.id);
          createdAt.set(result.data.id, started);
        } else if (
          !Array.isArray(result.data.orders) ||
          result.data.orders.length > 25 ||
          result.data.orders.some(
            (order: { restaurantId: number }) => order.restaurantId !== tenant.id,
          )
        )
          errors.push('Resposta de fila inválida ou isolamento violado.');
      };
      const start = performance.now();
      // Arrival rate remains fixed even when earlier requests are slow (open-loop).
      for (let i = 0; i < 600; i++) {
        const target = start + i * 100;
        await pause(Math.max(0, target - performance.now()));
        dispatchLag.push(Math.max(0, performance.now() - target));
        if (pending.size > 300) {
          errors.push('Gerador excedeu 300 requisições pendentes.');
          break;
        }
        submit(request(i, true));
        submit(request(i * 2, false));
        submit(request(i * 2 + 1, false));
      }
      await Promise.all([...pending]);
      const durationMs = performance.now() - start;
      const eventDeadline = Date.now() + 5_000;
      while ([...ids].some((id) => !seenEvents.has(id)) && Date.now() < eventDeadline)
        await pause(100);
      // Correlate after HTTP completes: a socket event may arrive before its response.
      const eventLatencies = [...ids]
        .filter((id) => receivedAt.has(id))
        .map((id) => receivedAt.get(id)! - createdAt.get(id)!);
      const groups = await prisma.order.groupBy({
        by: ['restaurantId'],
        where: { restaurantId: { in: tenants.map((tenant) => tenant.id) } },
        _count: { id: true },
      });
      const products = await prisma.product.findMany({
        where: { id: { in: tenants.map((tenant) => tenant.productId) } },
        select: { stock: true },
      });
      const report = {
        timestamp: new Date().toISOString(),
        environment: {
          platform: platform(),
          arch: arch(),
          cpuParallelism: availableParallelism(),
          memoryGb: Math.round(totalmem() / 1024 ** 3),
          node: process.version,
        },
        topology: {
          apiProcesses: 2,
          apiPoolEach: 10,
          restaurants: 120,
          sockets: sockets.length,
          database: 'disposable PostgreSQL, runtime NOSUPERUSER/NOBYPASSRLS',
        },
        profile: {
          seconds: 60,
          ordersPerRestaurantPerMinute: 5,
          targetOrders: 600,
          targetReads: 1200,
          basket: '1 product, pickup paid cash by admin; no external provider',
        },
        results: {
          durationMs: Math.round(durationMs),
          orders: orderLatencies.length,
          reads: readLatencies.length,
          uniqueOrders: ids.size,
          eventOrders: [...ids].filter((id) => seenEvents.has(id)).length,
          orderP95Ms: percentile(orderLatencies, 0.95),
          orderP99Ms: percentile(orderLatencies, 0.99),
          readP95Ms: percentile(readLatencies, 0.95),
          eventP95Ms: percentile(eventLatencies, 0.95),
          dispatchLagP95Ms: percentile(dispatchLag, 0.95),
          errors: errors.slice(0, 30),
          errorCount: errors.length,
        },
        limitations:
          'Local synthetic benchmark. Does not certify production sizing, long-duration soak, payment providers, print hardware or backup recovery.',
      };
      await writeFile(
        '../artifacts/runtime-scale-120-restaurants.json',
        JSON.stringify(report, null, 2) + '\n',
      );
      console.log('SCALE_REPORT', JSON.stringify(report));
      assert.equal(errors.length, 0, errors.slice(0, 5).join('\n'));
      assert.equal(ids.size, 600);
      assert.equal(readLatencies.length, 1200);
      assert.equal(groups.length, 120);
      assert.ok(groups.every((group) => group._count.id === 5));
      assert.ok(products.every((product) => product.stock === 995));
      assert.ok(
        [...ids].every((id) => seenEvents.has(id)),
        'Pedidos sem evento entre réplicas',
      );
      assert.ok(report.results.orderP95Ms <= 2000, 'p95 criação superior a 2 s');
      assert.ok(report.results.readP95Ms <= 1000, 'p95 leitura superior a 1 s');
      assert.ok(report.results.dispatchLagP95Ms <= 250, 'Gerador não sustentou a taxa oferecida');
    } finally {
      sockets.forEach((socket) => socket.disconnect());
      await b?.close();
      await a.close();
    }
  },
);
