import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { Prisma } from '@prisma/client';
import { setTenantDbContext } from '../../database/tenantDbContext.js';
import {
  prisma,
  runtimePrisma,
  resetTenantE2EDatabase,
  seedTenantE2EFixture,
} from './tenantE2EHarness.js';

after(async () => {
  await prisma.$disconnect();
  await runtimePrisma.$disconnect();
});

test(
  'ACID em PostgreSQL real: estoque e pedido revertem juntos se uma transacao falha',
  { timeout: 60_000 },
  async () => {
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const restaurantId = fixture.restaurants.a.id;
    const productId = fixture.products.a.id;
    const otherProductId = fixture.products.b.id;
    const initialOtherStock = (await prisma.product.findUniqueOrThrow({
      where: { id: otherProductId },
      select: { stock: true },
    })).stock;

    // Apenas o banco E2E descartavel recebe este estoque sintético.
    await prisma.product.update({ where: { id: productId }, data: { stock: 1 } });
    const originalOrders = await prisma.order.count({ where: { restaurantId } });

    const attempt = (failBeforeCommit: boolean) =>
      runtimePrisma.$transaction(
        async (tx) => {
          await setTenantDbContext(tx, restaurantId);
          const reserved = await tx.product.updateMany({
            where: { id: productId, restaurantId, active: true, stock: { gte: 1 } },
            data: { stock: { decrement: 1 } },
          });
          assert.equal(reserved.count, 1, 'somente um estoque suficiente pode ser reservado');

          const order = await tx.order.create({
            data: {
              restaurantId,
              type: 'RETIRADA',
              paymentMethod: 'DINHEIRO',
              total: 25,
              itemsSubtotal: 25,
            },
          });
          await tx.orderItem.create({
            data: { orderId: order.id, productId, price: 25, quantity: 1 },
          });

          if (failBeforeCommit) throw new Error('synthetic_failure_before_commit');
          return order.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

    await assert.rejects(attempt(true), /synthetic_failure_before_commit/u);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true },
      })).stock,
      1,
      'rollback deve restaurar estoque',
    );
    assert.equal(
      await prisma.order.count({ where: { restaurantId } }),
      originalOrders,
      'rollback nao pode deixar pedido parcial',
    );

    const committedId = await attempt(false);
    assert.equal(
      (await prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true },
      })).stock,
      0,
      'commit deve persistir a reserva',
    );
    assert.equal(await prisma.order.count({ where: { restaurantId } }), originalOrders + 1);
    assert.equal(
      await prisma.orderItem.count({ where: { orderId: committedId, productId } }),
      1,
    );
    assert.equal(
      (await prisma.product.findUniqueOrThrow({
        where: { id: otherProductId },
        select: { stock: true },
      })).stock,
      initialOtherStock,
      'operacao de A nao pode alterar estoque de B',
    );
  },
);
