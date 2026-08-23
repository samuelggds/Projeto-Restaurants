import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

class CouponRepository {
  async create(data: Prisma.CouponUncheckedCreateInput) {
    return prisma.coupon.create({
      data,
    });
  }

  async findAllByRestaurant(restaurantId: number | string) {
    return prisma.coupon.findMany({
      where: {
        restaurantId: Number(restaurantId),
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findById(id: number | string, restaurantId: number | string) {
    return prisma.coupon.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
    });
  }

  async findByCode(code: string, restaurantId: number | string) {
    return prisma.coupon.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
        restaurantId: Number(restaurantId),
      },
    });
  }

  async findActiveById(
    id: number | string,
    restaurantId: number | string,
    now = new Date(),
  ) {
    return prisma.coupon.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
        active: true,
        OR: [{ expiration: null }, { expiration: { gt: now } }],
      },
    });
  }

  async findActiveLoyaltyByRestaurant(restaurantId: number | string, now = new Date()) {
    return prisma.coupon.findMany({
      where: {
        restaurantId: Number(restaurantId),
        active: true,
        OR: [{ expiration: null }, { expiration: { gt: now } }],
      },
      orderBy: [{ loyaltyPurchasesRequired: 'asc' }, { id: 'desc' }],
    });
  }

  async countCompletedPurchases(
    userId: number | string,
    restaurantId: number | string,
    completedAfter?: Date | null,
  ) {
    return prisma.order.count({
      where: {
        userId: Number(userId),
        restaurantId: Number(restaurantId),
        paid: true,
        status: 'ENTREGUE',
        ...(completedAfter
          ? {
              OR: [
                { deliveredAt: { gt: completedAfter } },
                { deliveredAt: null, updatedAt: { gt: completedAfter } },
              ],
            }
          : {}),
      },
    });
  }

  async findRedemptions(
    userId: number | string,
    restaurantId: number | string,
    couponIds: number[],
  ) {
    if (couponIds.length === 0) return [];

    return prisma.couponRedemption.findMany({
      where: {
        userId: Number(userId),
        restaurantId: Number(restaurantId),
        couponId: { in: couponIds },
      },
      include: { order: { select: { id: true } } },
      orderBy: [{ couponId: 'asc' }, { cycle: 'asc' }],
    });
  }

  async findAllRedemptions(userId: number | string, restaurantId: number | string) {
    return prisma.couponRedemption.findMany({
      where: {
        userId: Number(userId),
        restaurantId: Number(restaurantId),
      },
      include: {
        coupon: true,
        order: { select: { id: true } },
      },
      orderBy: [{ claimedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async expireClaimedRedemptions({
    restaurantId,
    userId,
    couponIds,
    redemptionId,
    now = new Date(),
  }: {
    restaurantId?: number | string;
    userId?: number | string;
    couponIds?: number[];
    redemptionId?: number | string;
    now?: Date;
  } = {}) {
    return prisma.couponRedemption.updateMany({
      where: {
        status: 'CLAIMED',
        expiresAt: { lte: now },
        ...(restaurantId ? { restaurantId: Number(restaurantId) } : {}),
        ...(userId ? { userId: Number(userId) } : {}),
        ...(couponIds ? { couponId: { in: couponIds } } : {}),
        ...(redemptionId ? { id: Number(redemptionId) } : {}),
      },
      data: {
        status: 'EXPIRED',
        reservedAt: null,
      },
    });
  }

  async createRedemption(data: {
    restaurantId: number;
    couponId: number;
    userId: number;
    cycle: number;
    status: 'CLAIMED';
    claimedAt: Date;
    expiresAt: Date;
  }) {
    return prisma.couponRedemption.create({
      data,
      include: { order: { select: { id: true } } },
    });
  }

  async hasRedemptions(id: number | string, restaurantId: number | string) {
    const redemption = await prisma.couponRedemption.findFirst({
      where: {
        couponId: Number(id),
        restaurantId: Number(restaurantId),
      },
      select: { id: true },
    });

    return redemption !== null;
  }

  async update(id: number | string, restaurantId: number | string, data: Prisma.CouponUpdateInput) {
    const result = await prisma.coupon.updateMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return this.findById(id, restaurantId);
  }

  async delete(id: number | string, restaurantId: number | string) {
    return prisma.coupon.deleteMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
    });
  }
}

export default new CouponRepository();
