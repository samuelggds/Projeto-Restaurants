import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class SubscriptionRepository {
  async create(
    data: Prisma.SubscriptionUncheckedCreateInput,
    tx: PrismaClientLike = prisma,
  ) {
    return tx.subscription.create({
      data,
    });
  }

  async findByRestaurantId(restaurantId: number | string) {
    return prisma.subscription.findUnique({
      where: {
        restaurantId: Number(restaurantId),
      },
    });
  }

  async update(
    restaurantId: number | string,
    data: Prisma.SubscriptionUpdateInput,
    tx: PrismaClientLike = prisma,
  ) {
    return tx.subscription.update({
      where: {
        restaurantId: Number(restaurantId),
      },
      data,
    });
  }
}

export default new SubscriptionRepository();
