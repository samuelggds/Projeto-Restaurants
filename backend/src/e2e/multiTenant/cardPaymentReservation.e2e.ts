import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';
import attempts from '../../modules/orders/repositories/OrderPaymentAttemptRepository.js';

test(
  'PostgreSQL serializa retries de cartão, mantém tenant e não vincula resultado à tentativa errada',
  { timeout: 90_000 },
  async (t) => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    t.after(async () => {
      await runtimePrisma.$disconnect();
      await prisma.$disconnect();
    });
    const order = await prisma.order.update({
      where: { id: fixture.orders.a.id },
      data: {
        paid: false,
        status: 'PENDENTE',
        paymentMethod: 'CARTAO',
        payOnDelivery: false,
        createdAt: new Date(),
      },
    });
    const input = {
      orderId: order.id,
      restaurantId: order.restaurantId,
      amount: Number(order.total),
      provider: 'MERCADO_PAGO',
    };
    const first = await attempts.createCardAttempt(input);
    await attempts.update(first.id, order.restaurantId, 'DECLINED');
    const results = await Promise.all(
      Array.from({ length: 4 }, () => attempts.claimCardRetry(input)),
    );
    const claimed = results.find((result) => result.kind === 'CLAIMED');
    assert.ok(claimed?.kind === 'CLAIMED');
    assert.equal(results.filter((result) => result.kind === 'CLAIMED').length, 1);
    assert.equal(results.filter((result) => result.kind === 'PROCESSING').length, 3);
    assert.equal(await prisma.orderPaymentAttempt.count({ where: { orderId: order.id } }), 2);
    assert.equal(
      (await attempts.claimCardRetry({ ...input, restaurantId: fixture.restaurants.b.id })).kind,
      'UNAVAILABLE',
    );
    const binding = {
      orderId: order.id,
      restaurantId: order.restaurantId,
      attemptId: first.id,
      providerOrderId: 'ORD-RECOVERED',
      amount: Number(order.total),
    };
    assert.equal(await attempts.bindRecoveredProviderOrder(binding), false);
    assert.equal(
      await attempts.bindRecoveredProviderOrder({ ...binding, attemptId: claimed.attempt.id }),
      true,
    );
    assert.equal(
      await attempts.bindRecoveredProviderOrder({
        ...binding,
        attemptId: claimed.attempt.id,
        providerOrderId: 'ORD-OTHER',
      }),
      false,
    );
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).cardCheckoutSessionId,
      'mp_order:ORD-RECOVERED',
    );
  },
);
