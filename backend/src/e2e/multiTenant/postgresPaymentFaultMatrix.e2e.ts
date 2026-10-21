import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { OrderType, PaymentMethod, ProductSaleMode } from '@prisma/client';
import {
  apiRequest,
  assertDisposableTenantDatabase,
  prisma,
  resetTenantE2EDatabase,
  runtimePrisma,
  seedTenantE2EFixture,
  startTenantTestApplication,
} from './tenantE2EHarness.js';
import pix from '../../modules/orders/services/OrderPixPaymentService.js';
import { getCardCheckoutProviderHandler } from '../../modules/orders/services/cardCheckoutProviders.js';

// Execute ONLY through the tenant E2E runner: the owner database is disposable,
// loopback-only, and distinct from the restricted runtime role.
test(
  'DB-02/08: a falha PostgreSQL nao cria cobranca nem deixa pedido/estoque parcial',
  { timeout: 90_000 },
  async (t) => {
    assertDisposableTenantDatabase();
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const app = await startTenantTestApplication();
    const restaurantId = fixture.restaurants.a.id;
    const productId = fixture.products.a.id;
    const originalCreatePix = pix.createPixPayment;
    const cardProvider = getCardCheckoutProviderHandler('MERCADO_PAGO');
    const originalCreateCard = cardProvider.createCheckout;
    const functionName = 'tenant_e2e_block_order_commit';
    const triggerName = 'tenant_e2e_block_order_commit_trigger';
    let triggerInstalled = false;
    let gatewayCalls = 0;

    t.after(async () => {
      pix.createPixPayment = originalCreatePix;
      cardProvider.createCheckout = originalCreateCard;
      if (triggerInstalled) {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS "${triggerName}" ON "Order"`,
        );
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
      }
      await app.close();
      await runtimePrisma.$disconnect();
      await prisma.$disconnect();
    });

    await prisma.restaurantSettings.update({
      where: { restaurantId },
      data: {
        acceptsPix: true,
        acceptsCard: true,
        cardGateway: 'MERCADO_PAGO',
        pixProvider: 'MERCADO_PAGO',
        mercadoPagoAccessToken: 'TEST-tenant-failure-injection-a',
        mercadoPagoRefreshToken: 'TEST-tenant-failure-injection-refresh-a',
        mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
        mercadoPagoPublicKey: 'TEST-tenant-failure-injection-public-a',
      },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { stock: 10 },
    });
    pix.createPixPayment = async () => {
      gatewayCalls += 1;
      throw new Error('Nao iniciar PIX se PostgreSQL nao persistiu o pedido.');
    };
    cardProvider.createCheckout = async () => {
      gatewayCalls += 1;
      throw new Error('Nao iniciar cartao se PostgreSQL nao persistiu o pedido.');
    };

    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
      BEGIN
        IF NEW."restaurantId" = ${restaurantId} THEN
          RAISE EXCEPTION 'tenant_e2e_order_persistence_blocked';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}"
        BEFORE INSERT ON "Order"
        FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );
    triggerInstalled = true;
    const baselineCount = await prisma.order.count({ where: { restaurantId } });

    for (const method of ['PIX', 'CARTAO'] as const) {
      const endpoint = method === 'PIX' ? '/orders/pix/payment' : '/orders/card/checkout';
      const response = await apiRequest(app.baseUrl, endpoint, fixture.tokens.adminA, {
        method: 'POST',
        headers: { 'Idempotency-Key': randomUUID() },
        json: {
          restaurantId,
          type: OrderType.RETIRADA,
          paymentMethod: method,
          items: [{ productId, quantity: 1 }],
        },
      });
      assert.ok(
        response.response.status >= 400,
        `${method} nao pode retornar sucesso sem commit: ${JSON.stringify(response.data)}`,
      );
      assert.equal(gatewayCalls, 0, 'nao consultar o provedor antes do commit');
      assert.equal(await prisma.order.count({ where: { restaurantId } }), baselineCount);
      assert.equal(
        (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock,
        10,
      );
    }

    await prisma.$executeRawUnsafe(
      `DROP TRIGGER IF EXISTS "${triggerName}" ON "Order"`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    triggerInstalled = false;

    // DB-08: falha no terceiro item, depois da criacao do pedido e de itens
    // anteriores, deve desfazer tudo (inclusive reserva de estoque).
    const products = await Promise.all(
      [1, 2].map((i) =>
        prisma.product.create({
          data: {
            name: `Produto adicional E2E ${i}`,
            price: 12 + i,
            stock: 10,
            active: true,
            saleMode: ProductSaleMode.COMPLETE,
            categoryId: fixture.categories.a.id,
            restaurantId,
          },
        }),
      ),
    );
    const thirdProductId = products[1].id;
    const initialOrders = await prisma.order.count({ where: { restaurantId } });
    const initialItems = await prisma.orderItem.count({ where: { restaurantId } });
    const stockSnapshot = await Promise.all(
      [productId, ...products.map((p) => p.id)].map(async (id) =>
        (await prisma.product.findUniqueOrThrow({ where: { id } })).stock,
      ),
    );

    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
      BEGIN
        IF NEW."productId" = ${thirdProductId} THEN
          RAISE EXCEPTION 'tenant_e2e_third_item_failure';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER "${triggerName}"
        BEFORE INSERT ON "OrderItem"
        FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
    );
    triggerInstalled = true;
    try {
      const create = await apiRequest(app.baseUrl, '/orders', fixture.tokens.adminA, {
        method: 'POST',
        headers: { 'Idempotency-Key': randomUUID() },
        json: {
          restaurantId,
          type: OrderType.RETIRADA,
          paymentMethod: PaymentMethod.DINHEIRO,
          items: [productId, ...products.map((p) => p.id)].map((id) => ({
            productId: id,
            quantity: 1,
          })),
        },
      });
      assert.ok(create.response.status >= 400, 'erro no item final nao pode confirmar pedido');
      assert.equal(await prisma.order.count({ where: { restaurantId } }), initialOrders);
      assert.equal(await prisma.orderItem.count({ where: { restaurantId } }), initialItems);
      const afterStock = await Promise.all(
        [productId, ...products.map((p) => p.id)].map(async (id) =>
          (await prisma.product.findUniqueOrThrow({ where: { id } })).stock,
        ),
      );
      assert.deepEqual(afterStock, stockSnapshot);
      assert.equal(gatewayCalls, 0);
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON "OrderItem"`,
      );
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
      triggerInstalled = false;
    }

    const recovered = await apiRequest(app.baseUrl, '/orders', fixture.tokens.adminA, {
      method: 'POST',
      headers: { 'Idempotency-Key': randomUUID() },
      json: {
        restaurantId,
        type: OrderType.RETIRADA,
        paymentMethod: PaymentMethod.DINHEIRO,
        items: [{ productId, quantity: 1 }],
      },
    });
    assert.equal(recovered.response.status, 201, JSON.stringify(recovered.data));
    assert.equal(await prisma.order.count({ where: { restaurantId } }), initialOrders + 1);

    // Confirma que os dados do restaurante B nao foram afetados.
    assert.equal(
      (await prisma.order.findUniqueOrThrow({ where: { id: fixture.orders.b.id } })).restaurantId,
      fixture.restaurants.b.id,
    );
    assert.equal(
      (await prisma.product.findUniqueOrThrow({ where: { id: fixture.products.b.id } })).restaurantId,
      fixture.restaurants.b.id,
    );
  },
);
