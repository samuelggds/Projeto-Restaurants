import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

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
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id: number | string, restaurantId: number | string) {
    return prisma.banner.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
    });
  }

  async update(id: number | string, restaurantId: number | string, data: Prisma.BannerUpdateInput) {
    const result = await prisma.banner.updateMany({
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
    return prisma.banner.deleteMany({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
    });
  }
}

export default new BannerRepository();
