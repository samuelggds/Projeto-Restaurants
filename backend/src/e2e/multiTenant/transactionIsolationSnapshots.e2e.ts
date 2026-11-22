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
  'PostgreSQL real: Read Committed atualiza o snapshot; Repeatable Read e Serializable o mantem',
  { timeout: 90_000 },
  async () => {
    // O harness recusa bases remotas ou sem marcador ci/e2e/test.
    await resetTenantE2EDatabase();
    const fixture = await seedTenantE2EFixture();
    const restaurantId = fixture.restaurants.a.id;
    const productId = fixture.products.a.id;

    async function observeSecondRead(
      isolationLevel: Prisma.TransactionIsolationLevel,
      expectedSecondRead: number,
    ) {
      await prisma.product.update({ where: { id: productId }, data: { stock: 5 } });

      let signalFirstRead!: (value: number | null) => void;
      let rejectFirstRead!: (error: unknown) => void;
      const firstReadReady = new Promise<number | null>((resolve, reject) => {
        signalFirstRead = resolve;
        rejectFirstRead = reject;
      });

      let releaseSecondRead!: () => void;
      const writerCommitted = new Promise<void>((resolve) => {
        releaseSecondRead = resolve;
      });

      // A transação do leitor continua aberta enquanto o outro cliente
      // confirma o UPDATE. Sem sleep: os sinais controlam a ordem.
      const readerTransaction = runtimePrisma.$transaction(
        async (tx) => {
          try {
            await setTenantDbContext(tx, restaurantId);
            const first = await tx.product.findUniqueOrThrow({
              where: { id: productId, restaurantId },
              select: { stock: true },
            });
            signalFirstRead(first.stock);
            await writerCommitted;
            const second = await tx.product.findUniqueOrThrow({
              where: { id: productId, restaurantId },
              select: { stock: true },
            });
            return { first: first.stock, second: second.stock };
          } catch (error) {
            rejectFirstRead(error);
            throw error;
          }
        },
        { isolationLevel, maxWait: 5_000, timeout: 20_000 },
      );

      try {
        assert.equal(await firstReadReady, 5, 'leitura inicial deve ocorrer antes do UPDATE');
        // Em conexão independente, a alteração é confirmada antes do segundo SELECT.
        await prisma.product.update({ where: { id: productId }, data: { stock: 4 } });
        releaseSecondRead();
        const observed = await readerTransaction;

        assert.equal(observed.first, 5);
        assert.equal(observed.second, expectedSecondRead);
        assert.equal(
          (await prisma.product.findUniqueOrThrow({
            where: { id: productId },
            select: { stock: true },
          })).stock,
          4,
          'a alteração externa deve estar confirmada no banco',
        );
      } finally {
        releaseSecondRead();
        await readerTransaction.catch(() => undefined);
      }
    }

    await observeSecondRead(Prisma.TransactionIsolationLevel.ReadCommitted, 4);
    await observeSecondRead(Prisma.TransactionIsolationLevel.RepeatableRead, 5);
    // Não há anomalia nesta leitura sem escrita: é serializável como leitor antes do writer.
    await observeSecondRead(Prisma.TransactionIsolationLevel.Serializable, 5);
  },
);
