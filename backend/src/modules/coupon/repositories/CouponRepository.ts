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
        code,
        restaurantId: Number(restaurantId),
      },
    });
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
