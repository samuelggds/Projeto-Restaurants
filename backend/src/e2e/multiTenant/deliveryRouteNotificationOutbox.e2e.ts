import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { OrderStatus, OrderType, PaymentMethod, UserRole } from '@prisma/client';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';
import startCourierRouteService from '../../modules/orders/services/StartCourierRouteService.js';
import { recordWhatsappOrderNotificationOptIn } from '../../services/whatsappOrderConsent.js';
import { deliverNotificationOutbox } from '../../services/notificationOutbox.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test('rota + aviso: commit atomico, replay idempotente, falha de outbox e isolamento', { timeout: 60_000 }, async () => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const restaurantId = fixture.restaurants.a.id;
  const courierId = fixture.users.courierA.id;
  const customerId = fixture.users.customerA.id;
  const webhookBefore = process.env.WHATSAPP_WEBHOOK_URL;
  const providerBefore = process.env.CUSTOMER_NOTIFICATION_PROVIDER;
  process.env.WHATSAPP_WEBHOOK_URL = 'http://127.0.0.1:9/notification-simulated';
  process.env.CUSTOMER_NOTIFICATION_PROVIDER = 'whatsapp_webhook';

  const newReadyOrder = () => prisma.order.create({
    data: {
      restaurantId,
      userId: customerId,
      assignedCourierId: courierId,
      type: OrderType.DELIVERY,
      status: OrderStatus.PRONTO,
      paid: false,
      paymentMethod: PaymentMethod.DINHEIRO,
      total: 25,
      itemsSubtotal: 25,
    },
  });

  const startRoute = (orderId: number) => startCourierRouteService.execute({
    orderId,
    restaurantId,
    courierId,
    role: UserRole.MOTOQUEIRO,
    initialLocation: null,
  });
  const notificationRows = () => prisma.$queryRaw<Array<{
    id: string;
    restaurantId: number;
    status: string;
    attempts: number;
    payload: string | null;
  }>>`
    SELECT "id", "restaurantId", "status", "attempts", "payload"
    FROM "NotificationOutbox"
    ORDER BY "createdAt", "id"
  `;

  let triggerInstalled = false;
  try {
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { whatsapp: '+5511999990000' },
    });
    await prisma.restaurantSettings.update({
      where: { restaurantId },
      data: { whatsappEnabled: true, receiveStatusNotifications: true },
    });

    const first = await newReadyOrder();
    await recordWhatsappOrderNotificationOptIn({
      restaurantId, orderId: first.id, userId: customerId, customerPhone: '11999990000',
    });

    const started = await startRoute(first.id);
    assert.equal(started.status, OrderStatus.SAIU_PARA_ENTREGA);
    let rows = await notificationRows();
    assert.equal(rows.length, 1, 'status e aviso precisam existir no mesmo commit');
    assert.equal(rows[0].restaurantId, restaurantId);
    assert.equal(rows[0].status, 'PENDING');
    assert.match(rows[0].payload || '', /^enc:v1:/u);
    assert.doesNotMatch(rows[0].payload || '', /11999990000/u);

    // Reprocessar o mesmo comando não cria segundo aviso.
    const replay = await startRoute(first.id);
    assert.equal(replay.id, first.id);
    assert.equal((await notificationRows()).length, 1);

    // O tenant B não pode alterar a rota ou a outbox do tenant A.
    await assert.rejects(startCourierRouteService.execute({
      orderId: first.id,
      restaurantId: fixture.restaurants.b.id,
      courierId: fixture.users.courierB.id,
      role: UserRole.MOTOQUEIRO,
      initialLocation: null,
    }));
    assert.equal((await notificationRows()).length, 1);

    // Um worker recebe erro remoto, deixa o aviso durável e depois o retoma.
    const keys: string[] = [];
    const remoteFailure = (async (_url, init) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key') || '');
      return new Response('temporarily unavailable', { status: 503 });
    }) as typeof fetch;
    await deliverNotificationOutbox(runtimePrisma, remoteFailure);
    rows = await notificationRows();
    assert.equal(rows[0].status, 'PENDING');
    assert.equal(rows[0].attempts, 1);
    await prisma.$executeRaw`
      UPDATE "NotificationOutbox" SET "availableAt" = clock_timestamp() - INTERVAL '1 second'
      WHERE "id" = ${rows[0].id}::uuid
    `;
    const remoteSuccess = (async (_url, init) => {
      keys.push(new Headers(init?.headers).get('Idempotency-Key') || '');
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    await deliverNotificationOutbox(runtimePrisma, remoteSuccess);
    rows = await notificationRows();
    assert.equal(rows[0].status, 'DELIVERED');
    assert.equal(rows[0].payload, null, 'conteudo privado apagado apos entrega');
    assert.equal(keys.length, 2);
    assert.ok(keys[0]);
    assert.equal(keys[0], keys[1], 'retentativa usa a mesma chave de idempotencia');

    // Entrega A concluída para o motoqueiro iniciar outro pedido.
    await prisma.order.update({
      where: { id: first.id },
      data: { status: OrderStatus.ENTREGUE },
    });

    const second = await newReadyOrder();
    await recordWhatsappOrderNotificationOptIn({
      restaurantId, orderId: second.id, userId: customerId, customerPhone: '11999990000',
    });

    // Uma falha SQL no INSERT da outbox deve provocar rollback também da rota.
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION e2e_fail_delivery_outbox() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'e2e_outbox_insert_failure';
      END;
      $$ LANGUAGE plpgsql
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER e2e_fail_delivery_outbox_insert
      BEFORE INSERT ON "NotificationOutbox"
      FOR EACH ROW EXECUTE FUNCTION e2e_fail_delivery_outbox()
    `);
    triggerInstalled = true;
    await assert.rejects(startRoute(second.id), /e2e_outbox_insert_failure/u);
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: second.id } })).status,
      OrderStatus.PRONTO,
      'notificacao falhou: mudanca do pedido precisa de rollback',
    );
    assert.equal((await notificationRows()).length, 1, 'nunca deixar aviso ou rota parciais');

    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS e2e_fail_delivery_outbox_insert ON "NotificationOutbox"',
    );
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS e2e_fail_delivery_outbox()');
    triggerInstalled = false;

    assert.equal((await startRoute(second.id)).status, OrderStatus.SAIU_PARA_ENTREGA);
    assert.equal((await notificationRows()).length, 2);
    await prisma.order.update({ where: { id: second.id }, data: { status: OrderStatus.ENTREGUE } });

    // Falta de consentimento nunca pode gerar WhatsApp automático.
    const third = await newReadyOrder();
    assert.equal((await startRoute(third.id)).status, OrderStatus.SAIU_PARA_ENTREGA);
    assert.equal((await notificationRows()).length, 2);
  } finally {
    if (triggerInstalled) {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS e2e_fail_delivery_outbox_insert ON "NotificationOutbox"',
      );
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS e2e_fail_delivery_outbox()');
    }
    if (webhookBefore === undefined) delete process.env.WHATSAPP_WEBHOOK_URL;
    else process.env.WHATSAPP_WEBHOOK_URL = webhookBefore;
    if (providerBefore === undefined) delete process.env.CUSTOMER_NOTIFICATION_PROVIDER;
    else process.env.CUSTOMER_NOTIFICATION_PROVIDER = providerBefore;
  }
});
