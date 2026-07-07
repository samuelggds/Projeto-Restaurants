import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

class BannerRepository {
  async create(data: Prisma.BannerUncheckedCreateInput) {
    return prisma.banner.create({
      data,
    });
  }

  async findAllByRestaurant(restaurantId: number | string) {
    return prisma.banner.findMany({
      where: {
        restaurantId: Number(restaurantId),
      },
      orderBy: {
        id: "desc",
      },
    });
  }

  async findById(id: number | string) {
    return prisma.banner.findUnique({
      where: {
        id: Number(id),
      },
    });
  }

  async update(id: number | string, data: Prisma.BannerUpdateInput) {
    return prisma.banner.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async delete(id: number | string) {
    return prisma.banner.delete({
      where: {
        id: Number(id),
      },
    });
  }
}

export default new BannerRepository();
