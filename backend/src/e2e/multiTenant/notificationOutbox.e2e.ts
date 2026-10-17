import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';
import {
  deliverNotificationOutbox,
  enqueueWhatsappNotification,
} from '../../services/notificationOutbox.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test(
  'avisos duráveis: concorrência, retry, consentimento e retenção com PostgreSQL real',
  { timeout: 60_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const restaurantId = fixture.restaurants.a.id;
    await prisma.restaurantSettings.update({
      where: { restaurantId },
      data: { whatsappEnabled: true, receiveStatusNotifications: true },
    });
    const endpointBefore = process.env.WHATSAPP_WEBHOOK_URL;
    process.env.WHATSAPP_WEBHOOK_URL = 'http://127.0.0.1:9/simulated';
    const message = {
      channel: 'whatsapp' as const,
      from: '+5511999990000',
      to: '+5511999990001',
      message: 'Somente mensagem sintética',
      metadata: { restaurantId, orderId: fixture.orders.a.id, event: 'PAYMENT_CONFIRMED' },
    };
    try {
      await t.test('evento repetido entre APIs mantém uma fila e payload cifrado', async () => {
        await Promise.all(Array.from({ length: 8 }, () => enqueueWhatsappNotification(message)));
        const rows = await prisma.$queryRaw<
          Array<{ payload: string; status: string }>
        >`SELECT "payload", "status" FROM "NotificationOutbox"`;
        assert.equal(rows.length, 1);
        assert.equal(rows[0].status, 'PENDING');
        assert.match(rows[0].payload, /^enc:v1:/);
        assert.ok(!rows[0].payload.includes(message.to));
        const wrongTenant = await enqueueWhatsappNotification({
          ...message,
          metadata: { ...message.metadata, restaurantId: fixture.restaurants.b.id },
        });
        assert.equal(wrongTenant.reason, 'order_scope_mismatch');
      });
      const receivedKeys: string[] = [];
      await t.test('falha remota fica recuperável e nova tentativa preserva a chave', async () => {
        const send = (async (_url, init) => {
          receivedKeys.push(new Headers(init?.headers).get('Idempotency-Key')!);
          assert.equal(init?.redirect, 'error');
          assert.ok(init?.signal);
          return new Response('unavailable', { status: 503 });
        }) as typeof fetch;
        await deliverNotificationOutbox(runtimePrisma, send);
        const [row] = await prisma.$queryRaw<
          Array<{ status: string; attempts: number; payload: string }>
        >`SELECT * FROM "NotificationOutbox"`;
        assert.equal(row.status, 'PENDING');
        assert.equal(row.attempts, 1);
        assert.ok(row.payload);
        await prisma.$executeRaw`UPDATE "NotificationOutbox" SET "availableAt" = clock_timestamp() - INTERVAL '1 second'`;
      });
      await t.test('dois workers concorrentes não enviam a mesma linha reservada', async () => {
        let entered!: () => void;
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const started = new Promise<void>((resolve) => {
          entered = resolve;
        });
        const send = (async (_url, init) => {
          receivedKeys.push(new Headers(init?.headers).get('Idempotency-Key')!);
          entered();
          await gate;
          return new Response(null, { status: 204 });
        }) as typeof fetch;
        const first = deliverNotificationOutbox(runtimePrisma, send);
        await started;
        try {
          assert.equal((await deliverNotificationOutbox(runtimePrisma, send)).processed, 0);
        } finally {
          release();
        }
        await first;
        assert.equal(receivedKeys.length, 2);
        assert.equal(receivedKeys[0], receivedKeys[1]);
        const [row] = await prisma.$queryRaw<
          Array<{ status: string; payload: string | null }>
        >`SELECT * FROM "NotificationOutbox"`;
        assert.equal(row.status, 'DELIVERED');
        assert.equal(row.payload, null);
      });
      await t.test(
        'desligar avisos antes do envio descarta dados sem contatar provedor',
        async () => {
          await enqueueWhatsappNotification({
            ...message,
            metadata: { ...message.metadata, event: 'ORDER_STATUS_CHANGED', status: 'PRONTO' },
          });
          await prisma.restaurantSettings.update({
            where: { restaurantId },
            data: { receiveStatusNotifications: false },
          });
          const send = (async () => {
            throw new Error('não deve enviar');
          }) as typeof fetch;
          const result = await deliverNotificationOutbox(runtimePrisma, send);
          assert.equal(result.processed, 1);
          const [row] = await prisma.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT COUNT(*)::bigint AS count FROM "NotificationOutbox" WHERE "status" = 'DISCARDED' AND "payload" IS NULL`;
          assert.equal(row.count, 1n);
        },
      );
      await t.test(
        'lease expirado retoma após queda do worker; falha final remove conteúdo privado',
        async () => {
          await prisma.restaurantSettings.update({
            where: { restaurantId },
            data: { receiveStatusNotifications: true },
          });
          await enqueueWhatsappNotification({
            ...message,
            metadata: { ...message.metadata, event: 'ORDER_STATUS_CHANGED', status: 'ENTREGUE' },
          });
          await prisma.$executeRaw`UPDATE "NotificationOutbox" SET "attempts" = 7, "lockedUntil" = clock_timestamp() - INTERVAL '1 second' WHERE "status" = 'PENDING'`;
          await deliverNotificationOutbox(runtimePrisma, (async () => {
            throw new Error('secret remote body');
          }) as typeof fetch);
          const [row] = await prisma.$queryRaw<
            Array<{ count: bigint }>
          >`SELECT COUNT(*)::bigint AS count FROM "NotificationOutbox" WHERE "status" = 'FAILED' AND "payload" IS NULL AND "attempts" = 8`;
          assert.equal(row.count, 1n);
        },
      );
    } finally {
      if (endpointBefore === undefined) delete process.env.WHATSAPP_WEBHOOK_URL;
      else process.env.WHATSAPP_WEBHOOK_URL = endpointBefore;
    }
  },
);

test(
  'pedido e notificação compartilham commit: rollback não deixa mensagem órfã e replay é único',
  { timeout: 60_000 },
  async () => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const restaurantId = fixture.restaurants.a.id;
    const orderId = fixture.orders.a.id;
    const message = {
      channel: 'whatsapp' as const,
      from: '+5511999990000',
      to: '+5511999990001',
      message: 'Aviso transacional sintético de pedido em preparo',
      metadata: {
        restaurantId,
        orderId,
        event: 'ORDER_STATUS_CHANGED',
        status: 'PREPARANDO',
        orderType: 'DELIVERY',
      },
    };

    // Este teste valida a primitiva transacional da outbox, sem fazer chamadas ao WhatsApp.
    await assert.rejects(
      () =>
        runtimePrisma.$transaction(async (tx) => {
          const changed = await tx.order.updateMany({
            where: { id: orderId, restaurantId, status: 'PENDENTE' },
            data: { status: 'PREPARANDO' },
          });
          assert.equal(changed.count, 1);
          const queued = await enqueueWhatsappNotification(message, tx);
          assert.equal(queued.queued, true);
          throw new Error('simulated_process_failure_before_commit');
        }),
      /simulated_process_failure_before_commit/u,
    );

    const rolledBackOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(rolledBackOrder.status, 'PENDENTE');
    const [rolledBackOutbox] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "NotificationOutbox"
      WHERE "restaurantId" = ${restaurantId}
    `;
    assert.equal(rolledBackOutbox.count, 0n);

    const committed = await runtimePrisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, restaurantId, status: 'PENDENTE' },
        data: { status: 'PREPARANDO' },
      });
      assert.equal(changed.count, 1);
      const queued = await enqueueWhatsappNotification(message, tx);
      assert.equal(queued.queued, true);
      return queued;
    });
    assert.equal(committed.queued, true);

    const persisted = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    assert.equal(persisted.status, 'PREPARANDO');
    const rows = await prisma.$queryRaw<
      Array<{ status: string; payload: string }>
    >`
      SELECT "status", "payload" FROM "NotificationOutbox"
      WHERE "restaurantId" = ${restaurantId}
    `;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'PENDING');
    assert.match(rows[0].payload, /^enc:v1:/u);
    assert.ok(!rows[0].payload.includes(message.to));

    // Duas reentregas não podem produzir nova intenção de envio após o commit.
    const replays = await Promise.all([
      enqueueWhatsappNotification(message),
      enqueueWhatsappNotification(message),
    ]);
    for (const replay of replays) {
      assert.equal(replay.queued, false);
      assert.equal(replay.duplicate, true);
    }
    const [afterReplays] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "NotificationOutbox"
      WHERE "restaurantId" = ${restaurantId}
    `;
    assert.equal(afterReplays.count, 1n);
  },
);
