import prisma from '../../../config/prisma.js';
import categoryRepository from '../../categories/repositories/CategoryRepository.js';
import orderRepository from '../repositories/OrderRepository.js';

class ClearOrdersAndCategoriesService {
  async execute(restaurantId: number | string, now = new Date()) {
    const normalizedRestaurantId = Number(restaurantId);

    if (!Number.isFinite(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurant inválido!');
    }

    await prisma.$transaction(async (db) => {
      const attachedRedemptions = await db.order.findMany({
        where: {
          restaurantId: normalizedRestaurantId,
          couponRedemptionId: { not: null },
        },
        select: { couponRedemptionId: true },
      });
      const redemptionIds = attachedRedemptions
        .map((order) => Number(order.couponRedemptionId || 0))
        .filter((id) => id > 0);
      if (redemptionIds.length > 0) {
        await db.couponRedemption.updateMany({
          where: {
            id: { in: redemptionIds },
            restaurantId: normalizedRestaurantId,
            status: 'RESERVED',
            expiresAt: { gt: now },
          },
          data: {
            status: 'CLAIMED',
            reservedAt: null,
            usedAt: null,
          },
        });
        await db.couponRedemption.updateMany({
          where: {
            id: { in: redemptionIds },
            restaurantId: normalizedRestaurantId,
            status: 'RESERVED',
            expiresAt: { lte: now },
          },
          data: {
            status: 'EXPIRED',
            reservedAt: null,
            usedAt: null,
          },
        });
      }

      await orderRepository.deleteAllByRestaurant(normalizedRestaurantId, db);
      await categoryRepository.deleteAllByRestaurant(normalizedRestaurantId, db);
    });
  }
}

export default new ClearOrdersAndCategoriesService();
