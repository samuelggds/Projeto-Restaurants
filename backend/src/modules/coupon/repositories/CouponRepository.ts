import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

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
        id: "desc",
      },
    });
  }

  async findById(id: number | string) {
    return prisma.coupon.findUnique({
      where: {
        id: Number(id),
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

  async update(id: number | string, data: Prisma.CouponUpdateInput) {
    return prisma.coupon.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async delete(id: number | string) {
    return prisma.coupon.delete({
      where: {
        id: Number(id),
      },
    });
  }
}

export default new CouponRepository();
