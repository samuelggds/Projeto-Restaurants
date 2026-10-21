import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { PrismaClient } from '@prisma/client';
import {
  assertDisposableTenantDatabase,
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';
import {
  deliverNotificationOutbox,
  enqueueWhatsappNotification,
} from '../../services/notificationOutbox.js';

type OutboxRow = {
  id: string;
  restaurantId: number;
  status: string;
  attempts: number;
  payload: string | null;
  lockedUntil: Date | null;
  lockToken: string | null;
  completedAt: Date | null;
};

const webhookUrl = 'http://127.0.0.1:9/e2e-outbox-no-network';

function configureFakeWebhook() {
  const oldProvider = process.env.CUSTOMER_NOTIFICATION_PROVIDER;
  const oldUrl = process.env.WHATSAPP_WEBHOOK_URL;
  process.env.CUSTOMER_NOTIFICATION_PROVIDER = 'whatsapp_webhook';
  process.env.WHATSAPP_WEBHOOK_URL = webhookUrl;
  return () => {
    if (oldProvider === undefined) delete process.env.CUSTOMER_NOTIFICATION_PROVIDER;
    else process.env.CUSTOMER_NOTIFICATION_PROVIDER = oldProvider;
    if (oldUrl === undefined) delete process.env.WHATSAPP_WEBHOOK_URL;
    else process.env.WHATSAPP_WEBHOOK_URL = oldUrl;
  };
}

function freshRuntimeConnection() {
  assertDisposableTenantDatabase();
  return new PrismaClient({
    datasources: {
      db: { url: String(process.env.TENANT_E2E_RUNTIME_DATABASE_URL || '') },
    },
  });
}

function readOutbox(restaurantId: number) {
  return prisma.$queryRaw<OutboxRow[]>`
    SELECT "id", "restaurantId", "status", "attempts", "payload",
           "lockedUntil", "lockToken", "completedAt"
    FROM "NotificationOutbox"
    WHERE "restaurantId" = ${restaurantId}
    ORDER BY "createdAt", "id"
  `;
}

after(async () => {
  await runtimePrisma.$disconnect();
  await prisma.$disconnect();
});

test(
  'outbox: commit duravel e worker novo recupera apos falha remota sem misturar tenants',
  { timeout: 60_000 },
  async () => {
    assertDisposableTenantDatabase();
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const tenantA = fixture.restaurants.a.id;
    const tenantB = fixture.restaurants.b.id;
    const restoreEnv = configureFakeWebhook();
    const nextWorker = freshRuntimeConnection();

    try {
      await Promise.all(
        [tenantA, tenantB].map((restaurantId) =>
          prisma.restaurantSettings.update({
            where: { restaurantId },
            data: { whatsappEnabled: true, receiveStatusNotifications: true },
          }),
        ),
      );

      const messageA = {
        channel: 'whatsapp' as const,
        from: '+5511999990000',
        to: '+5511988880001',
        message: 'Mensagem sintetica para o restaurante A',
        metadata: {
          event: 'ORDER_STATUS_CHANGED',
          status: 'PREPARANDO',
          orderType: 'DELIVERY',
          restaurantId: tenantA,
          orderId: fixture.orders.a.id,
        },
      };
      const committed = await runtimePrisma.$transaction(async (tx) => {
        const changed = await tx.order.updateMany({
          where: { id: fixture.orders.a.id, restaurantId: tenantA, status: 'PENDENTE' },
          data: { status: 'PREPARANDO' },
        });
        assert.equal(changed.count, 1);
        return enqueueWhatsappNotification(messageA, tx);
      });
      assert.equal(committed.queued, true);

      // Nao ha consumidor ativo entre o commit e esta leitura: a intencao
      // precisa estar no PostgreSQL, e nao apenas em memoria do processo.
      const [before] = await readOutbox(tenantA);
      assert.equal(before.status, 'PENDING');
      assert.equal(before.attempts, 0);
      assert.match(before.payload || '', /^enc:v1:/u);
      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: fixture.orders.a.id } })).status,
        'PREPARANDO',
      );

      const sentA: string[] = [];
      const deliveredA = await deliverNotificationOutbox(
        nextWorker,
        (async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as typeof messageA;
          assert.equal(body.metadata.restaurantId, tenantA);
          assert.equal(body.to, messageA.to);
          sentA.push(new Headers(init?.headers).get('Idempotency-Key') || '');
          return new Response(null, { status: 204 });
        }) as typeof fetch,
      );
      assert.deepEqual(deliveredA, { processed: 1, delivered: 1 });
      assert.deepEqual(sentA, [before.id]);
      const [afterA] = await readOutbox(tenantA);
      assert.equal(afterA.status, 'DELIVERED');
      assert.equal(afterA.payload, null);
      assert.equal(afterA.attempts, 1);

      const messageB = {
        ...messageA,
        to: '+5511988880002',
        message: 'Mensagem sintetica para o restaurante B',
        metadata: {
          ...messageA.metadata,
          restaurantId: tenantB,
          orderId: fixture.orders.b.id,
        },
      };
      const spoofed = await enqueueWhatsappNotification({
        ...messageB,
        metadata: { ...messageB.metadata, restaurantId: tenantA },
      });
      assert.equal(spoofed.reason, 'order_scope_mismatch');
      const queuedB = await enqueueWhatsappNotification(messageB);
      assert.equal(queuedB.queued, true);
      assert.equal((await readOutbox(tenantA)).length, 1);
      assert.equal((await readOutbox(tenantB)).length, 1);

      const keysB: string[] = [];
      const temporaryFailure = await deliverNotificationOutbox(
        runtimePrisma,
        (async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as typeof messageB;
          assert.equal(body.metadata.restaurantId, tenantB);
          assert.equal(body.to, messageB.to);
          keysB.push(new Headers(init?.headers).get('Idempotency-Key') || '');
          return new Response('Provedor temporariamente indisponivel', { status: 503 });
        }) as typeof fetch,
      );
      assert.deepEqual(temporaryFailure, { processed: 1, delivered: 0 });
      const [pendingB] = await readOutbox(tenantB);
      assert.equal(pendingB.status, 'PENDING');
      assert.equal(pendingB.attempts, 1);
      assert.match(pendingB.payload || '', /^enc:v1:/u);

      // Avanca apenas o agendamento do registro E2E; nao reduz o backoff
      // global nem altera o comportamento de producao.
      await prisma.$executeRaw`
        UPDATE "NotificationOutbox"
        SET "availableAt" = clock_timestamp() - INTERVAL '1 second'
        WHERE "id" = ${pendingB.id}::uuid
      `;
      const retriedB = await deliverNotificationOutbox(
        nextWorker,
        (async (_url, init) => {
          const body = JSON.parse(String(init?.body)) as typeof messageB;
          assert.equal(body.metadata.restaurantId, tenantB);
          assert.equal(body.to, messageB.to);
          keysB.push(new Headers(init?.headers).get('Idempotency-Key') || '');
          return new Response(null, { status: 204 });
        }) as typeof fetch,
      );
      assert.deepEqual(retriedB, { processed: 1, delivered: 1 });
      assert.deepEqual(keysB, [pendingB.id, pendingB.id]);
      const [afterB] = await readOutbox(tenantB);
      assert.equal(afterB.status, 'DELIVERED');
      assert.equal(afterB.attempts, 2);
      assert.equal(afterB.payload, null);
      assert.equal((await readOutbox(tenantA))[0].status, 'DELIVERED');
      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: fixture.orders.b.id } })).status,
        'PENDENTE',
      );
    } finally {
      restoreEnv();
      await nextWorker.$disconnect();
    }
  },
);

test(
  'outbox: lease retomado impede ACK atrasado de sobrescrever entrega mais recente',
  { timeout: 60_000 },
  async () => {
    assertDisposableTenantDatabase();
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const tenantA = fixture.restaurants.a.id;
    const restoreEnv = configureFakeWebhook();
    const replacementWorker = freshRuntimeConnection();

    let releaseFirst!: () => void;
    let firstWorker: Promise<{ processed: number; delivered: number }> | undefined;

    try {
      await prisma.restaurantSettings.update({
        where: { restaurantId: tenantA },
        data: { whatsappEnabled: true, receiveStatusNotifications: true },
      });
      const message = {
        channel: 'whatsapp' as const,
        from: '+5511999990000',
        to: '+5511988880003',
        message: 'Teste de lease da outbox',
        metadata: {
          event: 'ORDER_STATUS_CHANGED',
          status: 'PREPARANDO',
          orderType: 'DELIVERY',
          restaurantId: tenantA,
          orderId: fixture.orders.a.id,
        },
      };
      assert.equal((await enqueueWhatsappNotification(message)).queued, true);
      const [initial] = await readOutbox(tenantA);
      assert.equal(initial.status, 'PENDING');

      let markStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        markStarted = resolve;
      });
      const paused = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      const remoteKeys: string[] = [];

      // Simula um consumidor parado durante um envio. Nao espera dois
      // minutos: a expiracao do lease e injetada no banco E2E.
      firstWorker = deliverNotificationOutbox(
        runtimePrisma,
        (async (_url, init) => {
          remoteKeys.push(new Headers(init?.headers).get('Idempotency-Key') || '');
          markStarted();
          await paused;
          return new Response(null, { status: 204 });
        }) as typeof fetch,
      );
      await Promise.race([
        started,
        firstWorker.then(() => {
          throw new Error('O worker terminou sem enviar a notificacao.');
        }),
      ]);

      const [claimed] = await readOutbox(tenantA);
      assert.equal(claimed.status, 'PENDING');
      assert.equal(claimed.attempts, 1);
      assert.ok(claimed.lockedUntil);
      assert.ok(claimed.lockToken);
      assert.equal(claimed.id, initial.id);

      // Um segundo worker NAO pode tomar a linha enquanto o lease e valido.
      const duringLease = await deliverNotificationOutbox(
        replacementWorker,
        (async () => {
          throw new Error('Segundo worker nao pode enviar antes da expiracao do lease.');
        }) as typeof fetch,
      );
      assert.deepEqual(duringLease, { processed: 0, delivered: 0 });

      await prisma.$executeRaw`
        UPDATE "NotificationOutbox"
        SET "lockedUntil" = clock_timestamp() - INTERVAL '1 second'
        WHERE "id" = ${initial.id}::uuid
      `;
      const reclaimed = await deliverNotificationOutbox(
        replacementWorker,
        (async (_url, init) => {
          remoteKeys.push(new Headers(init?.headers).get('Idempotency-Key') || '');
          const body = JSON.parse(String(init?.body)) as typeof message;
          assert.equal(body.metadata.restaurantId, tenantA);
          assert.equal(body.to, message.to);
          return new Response(null, { status: 204 });
        }) as typeof fetch,
      );
      assert.deepEqual(reclaimed, { processed: 1, delivered: 1 });
      const [completed] = await readOutbox(tenantA);
      assert.equal(completed.status, 'DELIVERED');
      assert.equal(completed.attempts, 2);
      assert.equal(completed.payload, null);
      assert.equal(completed.lockToken, null);
      assert.ok(completed.completedAt);
      assert.deepEqual(remoteKeys, [initial.id, initial.id]);

      // O ACK do consumidor antigo chega depois. O token de fencing evita
      // que modifique completedAt, payload ou status ja gravados pelo novo.
      releaseFirst();
      await firstWorker;
      firstWorker = undefined;
      const [afterStaleAck] = await readOutbox(tenantA);
      assert.equal(afterStaleAck.status, 'DELIVERED');
      assert.equal(afterStaleAck.attempts, 2);
      assert.equal(afterStaleAck.payload, null);
      assert.equal(afterStaleAck.lockToken, null);
      assert.equal(afterStaleAck.completedAt?.toISOString(), completed.completedAt?.toISOString());
      assert.deepEqual(remoteKeys, [initial.id, initial.id]);

      // A entrega externa pode ocorrer mais de uma vez se o worker cair entre
      // a resposta remota e o ACK. O receptor deve deduplicar por este ID.
      assert.deepEqual(
        await deliverNotificationOutbox(replacementWorker, (async () => {
          throw new Error('Uma linha entregue nao pode ser reenviada.');
        }) as typeof fetch),
        { processed: 0, delivered: 0 },
      );
    } finally {
      releaseFirst?.();
      if (firstWorker) await firstWorker.catch(() => undefined);
      restoreEnv();
      await replacementWorker.$disconnect();
    }
  },
);
