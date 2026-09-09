import assert from 'node:assert/strict';
import test from 'node:test';
import type { Prisma } from '@prisma/client';
import { restoreOrderItemsStock } from './restoreOrderItemsStock.js';

test('cancelar repõe a quantidade agregada sem reativar disponibilidade manual', async () => {
  const product = { stock: 2, active: false };
  const calls: unknown[] = [];
  const tx = {
    product: {
      updateMany: async (input) => {
        calls.push(input);
        product.stock += input.data.stock.increment;
        Object.assign(
          product,
          Object.fromEntries(Object.entries(input.data).filter(([key]) => key !== 'stock')),
        );
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  await restoreOrderItemsStock(tx, {
    restaurantId: 7,
    items: [
      { productId: 5, quantity: 2 },
      { productId: 5, quantity: 1 },
      { productId: 0, quantity: 4 },
    ],
  });
  assert.deepEqual(product, { stock: 5, active: false });
  assert.deepEqual(calls, [
    { where: { id: 5, restaurantId: 7, stock: { gte: 0 } }, data: { stock: { increment: 3 } } },
  ]);
});
