import assert from 'node:assert/strict';
import test, { after, beforeEach } from 'node:test';
import {
  InvoicePaymentAttemptMethod,
  InvoicePaymentAttemptStatus,
  InvoiceStatus,
  PlanType,
  SubscriptionStatus,
} from '@prisma/client';

import processPaymentService from '../../modules/billing/services/ProcessPaymentService.js';
import restaurantAccessService from '../../modules/billing/services/RestaurantAccessService.js';
import {
  assertDisposableTenantDatabase,
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
} from './tenantE2EHarness.js';

assertDisposableTenantDatabase();

beforeEach(async () => {
  await resetTenantE2EDatabase();
});

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

async function billingFixture() {
  const restaurant = await prisma.restaurant.create({
    data: {
      name: 'Billing concurrency E2E',
      slug: `billing-concurrency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: `billing-${Date.now()}@tenant-e2e.test`,
      active: true,
      accessBlockReason: 'NONE',
    },
  });

  await prisma.subscription.create({
    data: {
      restaurantId: restaurant.id,
      plan: PlanType.PREMIUM,
      status: SubscriptionStatus.ATIVA,
      currentPeriodStart: new Date('2026-08-01T12:00:00.000Z'),
      currentPeriodEnd: new Date('2026-09-01T12:00:00.000Z'),
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      restaurantId: restaurant.id,
      month: 9,
      year: 2026,
      monthlyFee: 99.9,
      systemFees: 0,
      total: 99.9,
      status: InvoiceStatus.PENDENTE,
      dueDate: new Date('2026-09-01T12:00:00.000Z'),
    },
  });

  const attempts = await Promise.all(
    ['pix-concurrent-1', 'card-concurrent-2'].map((providerPaymentId, index) =>
      prisma.invoicePaymentAttempt.create({
        data: {
          invoiceId: invoice.id,
          restaurantId: restaurant.id,
          method:
            index === 0
              ? InvoicePaymentAttemptMethod.PIX
              : InvoicePaymentAttemptMethod.CARD,
          provider: 'MERCADO_PAGO',
          providerPaymentId,
          status: InvoicePaymentAttemptStatus.PENDING,
          amount: 99.9,
          providerStatus: 'approved',
        },
      }),
    ),
  );

  return { restaurant, invoice, attempts };
}

test('duas liquidações concorrentes aplicam uma única mensalidade e classificam a outra como duplicada', async () => {
  const { restaurant, invoice, attempts } = await billingFixture();

  const results = await Promise.all(
    attempts.map((attempt) =>
      processPaymentService.executeTracked({
        invoiceId: invoice.id,
        paymentAttemptId: attempt.id,
      }),
    ),
  );

  assert.deepEqual(
    results.map((result) => result.settlement).sort(),
    ['APPLIED', 'DUPLICATE'],
  );

  const storedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
  const storedAttempts = await prisma.invoicePaymentAttempt.findMany({
    where: { invoiceId: invoice.id, restaurantId: restaurant.id },
    orderBy: { id: 'asc' },
  });
  const storedRestaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurant.id },
  });

  assert.equal(storedInvoice.status, InvoiceStatus.PAGO);
  assert.equal(
    storedAttempts.filter((attempt) => attempt.status === InvoicePaymentAttemptStatus.APPLIED)
      .length,
    1,
  );
  assert.equal(
    storedAttempts.filter((attempt) => attempt.status === InvoicePaymentAttemptStatus.DUPLICATE)
      .length,
    1,
  );
  assert.equal(storedRestaurant.active, true);
  assert.equal(storedRestaurant.accessBlockReason, 'NONE');
});

test('pagamento concorrente com avaliação de inadimplência nunca deixa restaurante pago bloqueado', async () => {
  const { restaurant, invoice, attempts } = await billingFixture();

  await Promise.all([
    restaurantAccessService.evaluate(
      restaurant.id,
      runtimePrisma,
      new Date('2026-10-02T12:00:00.000Z'),
    ),
    processPaymentService.executeTracked({
      invoiceId: invoice.id,
      paymentAttemptId: attempts[0].id,
    }),
  ]);

  const storedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
  const storedRestaurant = await prisma.restaurant.findUniqueOrThrow({
    where: { id: restaurant.id },
  });
  const storedSubscription = await prisma.subscription.findUniqueOrThrow({
    where: { restaurantId: restaurant.id },
  });

  assert.equal(storedInvoice.status, InvoiceStatus.PAGO);
  assert.equal(storedRestaurant.active, true);
  assert.equal(storedRestaurant.accessBlockReason, 'NONE');
  assert.notEqual(storedSubscription.status, SubscriptionStatus.EXPIRADA);
});

test('FK composta impede associar tentativa de pagamento a fatura de outro tenant', async () => {
  const { restaurant: restaurantA, invoice } = await billingFixture();
  const restaurantB = await prisma.restaurant.create({
    data: {
      name: 'Billing tenant B E2E',
      slug: `billing-tenant-b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: `billing-b-${Date.now()}@tenant-e2e.test`,
      active: true,
    },
  });

  await assert.rejects(
    () =>
      prisma.invoicePaymentAttempt.create({
        data: {
          invoiceId: invoice.id,
          restaurantId: restaurantB.id,
          method: InvoicePaymentAttemptMethod.PIX,
          provider: 'MERCADO_PAGO',
          providerPaymentId: 'cross-tenant-forbidden',
          status: InvoicePaymentAttemptStatus.PENDING,
          amount: 99.9,
        },
      }),
  );

  const leaked = await prisma.invoicePaymentAttempt.count({
    where: {
      invoiceId: invoice.id,
      restaurantId: restaurantB.id,
    },
  });
  assert.equal(leaked, 0);

  const valid = await prisma.invoicePaymentAttempt.count({
    where: {
      invoiceId: invoice.id,
      restaurantId: restaurantA.id,
    },
  });
  assert.equal(valid, 2);
});
