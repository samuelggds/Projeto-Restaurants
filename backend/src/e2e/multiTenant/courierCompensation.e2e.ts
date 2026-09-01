import assert from 'node:assert/strict';
import test from 'node:test';
import { OrderStatus, OrderType, PaymentMethod } from '@prisma/client';

import {
  apiRequest,
  prisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';

test(
  'remuneração e acertos de motoqueiros permanecem isolados de ponta a ponta',
  { timeout: 120_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const application = await startTenantTestApplication();
    const request = (path: string, token: string, method = 'GET', json?: unknown) =>
      apiRequest(application.baseUrl, path, token, { method, ...(json ? { json } : {}) });

    try {
      await Promise.all([
        prisma.order.update({
          where: { id: fixture.orders.a.id },
          data: {
            status: OrderStatus.ENTREGUE,
            assignedCourierId: fixture.users.courierA.id,
            courierEarning: 7,
            deliveredAt: new Date(),
            paid: true,
            payOnDelivery: false,
          },
        }),
        prisma.order.update({
          where: { id: fixture.orders.b.id },
          data: {
            status: OrderStatus.ENTREGUE,
            assignedCourierId: fixture.users.courierB.id,
            courierEarning: 12,
            deliveredAt: new Date(),
            paid: true,
            payOnDelivery: true,
            payOnDeliveryMethod: PaymentMethod.DINHEIRO,
          },
        }),
      ]);

      await t.test('restaurantId adulterado não muda a regra de outro restaurante', async () => {
        const response = await request(
          '/courier-compensation/admin/configuration?restaurantId=' + fixture.restaurants.b.id,
          fixture.tokens.adminA,
          'PUT',
          {
            restaurantId: fixture.restaurants.b.id,
            timezone: 'America/Sao_Paulo',
            model: 'FIXED_PER_DELIVERY',
            fixedAmount: 14,
          },
        );
        assert.equal(response.response.status, 200);
        const policies = await prisma.courierCompensationPolicy.findMany({
          where: { courierId: null },
        });
        assert.equal(policies.length, 1);
        assert.equal(policies[0].restaurantId, fixture.restaurants.a.id);
        assert.equal(Number(policies[0].fixedAmount), 14);
      });

      await t.test('ADMIN A não inclui entrega real B em acerto A', async () => {
        const denied = await request(
          '/courier-compensation/admin/settlements',
          fixture.tokens.adminA,
          'POST',
          {
            restaurantId: fixture.restaurants.b.id,
            courierId: fixture.users.courierB.id,
            orderIds: [fixture.orders.b.id],
          },
        );
        assert.ok([400, 404].includes(denied.response.status));
        assert.equal(await prisma.courierSettlement.count(), 0);
      });

      let settlementPublicId = '';
      await t.test(
        'admin declara, motoqueiro correto visualiza e outro tenant não visualiza',
        async () => {
          const created = await request(
            '/courier-compensation/admin/settlements',
            fixture.tokens.adminB,
            'POST',
            {
              courierId: fixture.users.courierB.id,
              orderIds: [fixture.orders.b.id],
              paymentMethod: 'PIX',
            },
          );
          assert.equal(created.response.status, 201);
          settlementPublicId = created.data.publicId;
          assert.equal(created.data.grossCourierEarnings, 12);
          assert.equal(created.data.cashCollectedAmount, 35);
          assert.equal(created.data.netAmount, -23);

          const foreignList = await request(
            '/courier-compensation/courier/settlements',
            fixture.tokens.courierA,
          );
          assert.equal(foreignList.response.status, 200);
          assert.equal(foreignList.data.length, 0);

          const ownerList = await request(
            '/courier-compensation/courier/settlements',
            fixture.tokens.courierB,
          );
          assert.equal(ownerList.response.status, 200);
          assert.equal(ownerList.data[0].publicId, settlementPublicId);
        },
      );

      await t.test('motoqueiro A não confirma acerto B e confirmação B é idempotente', async () => {
        const denied = await request(
          `/courier-compensation/courier/settlements/${settlementPublicId}/confirm`,
          fixture.tokens.courierA,
          'POST',
        );
        assert.equal(denied.response.status, 404);
        assert.equal(
          (await prisma.order.findUniqueOrThrow({ where: { id: fixture.orders.b.id } }))
            .courierPaidAt,
          null,
        );

        const first = await request(
          `/courier-compensation/courier/settlements/${settlementPublicId}/confirm`,
          fixture.tokens.courierB,
          'POST',
        );
        const second = await request(
          `/courier-compensation/courier/settlements/${settlementPublicId}/confirm`,
          fixture.tokens.courierB,
          'POST',
        );
        assert.equal(first.response.status, 200);
        assert.equal(second.response.status, 200);
        assert.equal(first.data.status, 'CONFIRMED');
        assert.ok(
          (await prisma.order.findUniqueOrThrow({ where: { id: fixture.orders.b.id } }))
            .courierPaidAt,
        );
      });

      await t.test('restrição do banco resolve corrida para a mesma entrega', async () => {
        const order = await prisma.order.create({
          data: {
            total: 20,
            itemsSubtotal: 20,
            type: OrderType.DELIVERY,
            status: OrderStatus.ENTREGUE,
            paymentMethod: PaymentMethod.PIX,
            paid: true,
            restaurantId: fixture.restaurants.b.id,
            userId: fixture.users.customerB.id,
            assignedCourierId: fixture.users.courierB.id,
            courierEarning: 6,
            deliveredAt: new Date(),
          },
        });
        const payload = {
          courierId: fixture.users.courierB.id,
          orderIds: [order.id],
          paymentMethod: 'PIX',
        };
        const responses = await Promise.all([
          request(
            '/courier-compensation/admin/settlements',
            fixture.tokens.adminB,
            'POST',
            payload,
          ),
          request(
            '/courier-compensation/admin/settlements',
            fixture.tokens.adminB,
            'POST',
            payload,
          ),
        ]);
        assert.deepEqual(responses.map((entry) => entry.response.status).sort(), [201, 409]);
        assert.equal(
          await prisma.courierSettlementItem.count({ where: { orderId: order.id, active: true } }),
          1,
        );
      });

      await t.test('ganho da retirada vem do backend e fica congelado no pedido', async () => {
        await request('/courier-compensation/admin/configuration', fixture.tokens.adminB, 'PUT', {
          timezone: 'America/Sao_Paulo',
          model: 'FIXED_PER_DELIVERY',
          fixedAmount: 9.5,
        });
        const order = await prisma.order.create({
          data: {
            total: 22,
            itemsSubtotal: 22,
            type: OrderType.DELIVERY,
            status: OrderStatus.PRONTO,
            paymentMethod: PaymentMethod.DINHEIRO,
            payOnDelivery: true,
            payOnDeliveryMethod: PaymentMethod.DINHEIRO,
            restaurantId: fixture.restaurants.b.id,
            userId: fixture.users.customerB.id,
          },
        });
        const claimed = await request(
          `/orders/${order.id}/claim-delivery`,
          fixture.tokens.courierB,
          'PATCH',
          {
            courierEarning: 9999,
            restaurantId: fixture.restaurants.a.id,
            initialLocation: {
              latitude: -3.7319,
              longitude: -38.5267,
              accuracy: 5,
              sentAt: new Date().toISOString(),
            },
          },
        );
        assert.equal(claimed.response.status, 200);
        const persisted = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
        assert.equal(Number(persisted.courierEarning), 9.5);
        assert.equal(persisted.courierCompensationModel, 'FIXED_PER_DELIVERY');
        assert.ok(persisted.courierEarningCalculatedAt);

        await request('/courier-compensation/admin/configuration', fixture.tokens.adminB, 'PUT', {
          timezone: 'America/Sao_Paulo',
          model: 'FIXED_PER_DELIVERY',
          fixedAmount: 100,
        });
        assert.equal(
          Number(
            (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).courierEarning,
          ),
          9.5,
        );
      });
    } finally {
      await application.close();
    }
  },
);
