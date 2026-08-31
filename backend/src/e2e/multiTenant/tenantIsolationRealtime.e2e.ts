import assert from 'node:assert/strict';
import test from 'node:test';

import {
  apiRequest,
  connectTenantSocket,
  emitWithAck,
  expectNoSocketEvent,
  prisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
  waitForSocketEvent,
} from './tenantE2EHarness.js';

test('isolamento multi-tenant real em Socket.IO, eventos e GPS', { timeout: 90_000 }, async (t) => {
  await resetTenantE2EDatabase();
  const fixture = await seedTenantE2EFixture();
  const runtime = await startTenantTestApplication();
  const sockets = [];

  try {
    const adminA = await connectTenantSocket(runtime.baseUrl, fixture.tokens.adminA, {
      restaurantId: fixture.restaurants.b.id,
      room: `restaurant:${fixture.restaurants.b.id}:admin`,
    });
    sockets.push(adminA);
    const adminB = await connectTenantSocket(runtime.baseUrl, fixture.tokens.adminB);
    sockets.push(adminB);
    const employeeB = await connectTenantSocket(runtime.baseUrl, fixture.tokens.employeeB);
    sockets.push(employeeB);
    const courierA = await connectTenantSocket(runtime.baseUrl, fixture.tokens.courierA, {
      restaurantId: fixture.restaurants.b.id,
    });
    sockets.push(courierA);
    const courierB = await connectTenantSocket(runtime.baseUrl, fixture.tokens.courierB);
    sockets.push(courierB);

    await t.test(
      'handshake não permite forjar restaurantId nem entrar em room de outro tenant',
      () => {
        const serverSocketA = runtime.ioServer.sockets.sockets.get(adminA.id || '');
        assert.ok(serverSocketA);
        assert.ok(serverSocketA.rooms.has(`restaurant:${fixture.restaurants.a.id}`));
        assert.ok(serverSocketA.rooms.has(`restaurant:${fixture.restaurants.a.id}:admin`));
        assert.ok(!serverSocketA.rooms.has(`restaurant:${fixture.restaurants.b.id}`));
        assert.ok(!serverSocketA.rooms.has(`restaurant:${fixture.restaurants.b.id}:admin`));
      },
    );

    await t.test(
      'evento de status do Restaurante B chega a B e nunca ao Restaurante A',
      async () => {
        const receivedByB = waitForSocketEvent<any>(adminB, 'order:status-changed');
        const notReceivedByA = expectNoSocketEvent(adminA, 'order:status-changed');

        const update = await apiRequest(
          runtime.baseUrl,
          `/orders/${fixture.orders.realtimeB.id}/status`,
          fixture.tokens.adminB,
          { method: 'PUT', json: { status: 'PREPARANDO' } },
        );
        assert.equal(update.response.status, 200);

        const [payload] = await Promise.all([receivedByB, notReceivedByA]);
        assert.equal(payload.id, fixture.orders.realtimeB.id);
        assert.equal(payload.restaurantId, fixture.restaurants.b.id);
      },
    );

    await t.test('relato interno do funcionário B não vaza para o Admin A', async () => {
      const receivedByB = waitForSocketEvent<any>(adminB, 'support:chat-message');
      const notReceivedByA = expectNoSocketEvent(adminA, 'support:chat-message');
      const ack = await emitWithAck<{ ok: boolean; error?: string }>(
        employeeB,
        'support:chat-send',
        {
          type: 'employee-issue',
          reporterName: fixture.users.employeeB.name,
          reporterRole: 'waiter',
          subject: 'Teste de isolamento',
          description: 'Mensagem que deve permanecer somente no Restaurante B.',
          restaurantId: fixture.restaurants.a.id,
        },
      );
      assert.equal(ack.ok, true, ack.error);

      const [payload] = await Promise.all([receivedByB, notReceivedByA]);
      assert.equal(payload.restaurantId, fixture.restaurants.b.id);
      const stored = await prisma.supportChatMessage.findUniqueOrThrow({
        where: { id: Number(payload.id) },
      });
      assert.equal(stored.restaurantId, fixture.restaurants.b.id);
    });

    await t.test('motoqueiro A não grava GPS no pedido B', async () => {
      const before = await prisma.deliveryLocation.count({
        where: { orderId: fixture.orders.deliveryB.id },
      });
      const ack = await emitWithAck<{ ok: boolean; error?: string }>(
        courierA,
        'delivery:location:update',
        {
          orderId: fixture.orders.deliveryB.id,
          latitude: -23.55052,
          longitude: -46.633308,
          accuracy: 8,
          sentAt: new Date().toISOString(),
          restaurantId: fixture.restaurants.b.id,
        },
      );
      assert.equal(ack.ok, false);
      assert.match(String(ack.error || ''), /Pedido não encontrado/);

      const after = await prisma.deliveryLocation.count({
        where: { orderId: fixture.orders.deliveryB.id },
      });
      assert.equal(after, before);
    });

    await t.test('GPS legítimo de B persiste e é emitido somente ao tenant B', async () => {
      const receivedByB = waitForSocketEvent<any>(adminB, 'order:delivery-location');
      const notReceivedByA = expectNoSocketEvent(adminA, 'order:delivery-location');
      const ack = await emitWithAck<{ ok: boolean; error?: string; throttled?: boolean }>(
        courierB,
        'delivery:location:update',
        {
          orderId: fixture.orders.deliveryB.id,
          latitude: -23.551,
          longitude: -46.634,
          heading: 125,
          speed: 8,
          accuracy: 6,
          sentAt: new Date().toISOString(),
        },
      );
      assert.equal(ack.ok, true, ack.error);
      assert.notEqual(ack.throttled, true);

      const [payload] = await Promise.all([receivedByB, notReceivedByA]);
      assert.equal(payload.orderId, fixture.orders.deliveryB.id);
      assert.equal(payload.restaurantId, fixture.restaurants.b.id);
      const stored = await prisma.deliveryLocation.findFirstOrThrow({
        where: { orderId: fixture.orders.deliveryB.id, courierId: fixture.users.courierB.id },
      });
      assert.equal(stored.courierId, fixture.users.courierB.id);
    });
  } finally {
    for (const socket of sockets) socket.disconnect();
    await runtime.close();
    await resetTenantE2EDatabase();
    await prisma.$disconnect();
  }
});
