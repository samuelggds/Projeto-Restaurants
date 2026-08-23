// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import prisma from '../../../config/prisma.js';
import categoryRepository from '../../categories/repositories/CategoryRepository.js';
import orderRepository from '../repositories/OrderRepository.js';
import clearOrdersAndCategoriesService from './ClearOrdersAndCategoriesService.js';

test('cleanup libera reservas válidas, expira as vencidas e preserva as USED', async (t) => {
  const originalTransaction = prisma.$transaction;
  const originalDeleteOrders = orderRepository.deleteAllByRestaurant;
  const originalDeleteCategories = categoryRepository.deleteAllByRestaurant;
  const redemptionUpdates = [];
  const now = new Date('2026-08-23T15:00:00.000Z');

  const db = {
    order: {
      findMany: async () => [
        { couponRedemptionId: 10 },
        { couponRedemptionId: 11 },
      ],
    },
    couponRedemption: {
      updateMany: async (args) => {
        redemptionUpdates.push(args);
        return { count: 1 };
      },
    },
  };

  prisma.$transaction = async (callback) => callback(db);
  orderRepository.deleteAllByRestaurant = async () => ({ count: 2 });
  categoryRepository.deleteAllByRestaurant = async () => ({ count: 0 });

  t.after(() => {
    prisma.$transaction = originalTransaction;
    orderRepository.deleteAllByRestaurant = originalDeleteOrders;
    categoryRepository.deleteAllByRestaurant = originalDeleteCategories;
  });

  await clearOrdersAndCategoriesService.execute(7, now);

  assert.deepEqual(redemptionUpdates[0].where, {
    id: { in: [10, 11] },
    restaurantId: 7,
    status: 'RESERVED',
    expiresAt: { gt: now },
  });
  assert.deepEqual(redemptionUpdates[0].data, {
    status: 'CLAIMED',
    reservedAt: null,
    usedAt: null,
  });
  assert.deepEqual(redemptionUpdates[1].where, {
    id: { in: [10, 11] },
    restaurantId: 7,
    status: 'RESERVED',
    expiresAt: { lte: now },
  });
  assert.equal(redemptionUpdates[1].data.status, 'EXPIRED');
});
