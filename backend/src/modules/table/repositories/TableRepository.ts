import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class TableRepository {
  async create(
    data: Prisma.TableUncheckedCreateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.create({
      data,
    });
  }

  async findById(id: number | string, db: PrismaClientLike = prisma) {
    return db.table.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        restaurant: true,
      },
    });
  }

  async findByNumber(
    number: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.findFirst({
      where: {
        number: Number(number),
        restaurantId,
      },
    });
  }

  async findAllByRestaurant(
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.findMany({
      where: {
        restaurantId,
      },
      include: {
        _count: {
          select: {
            orders: true,
            tableSessions: true,
          },
        },
      },
      orderBy: {
        number: "asc",
      },
    });
  }

  async update(id: number | string, data: Prisma.TableUpdateInput) {
    return prisma.table.update({
      where: {
        id: Number(id),
      },
      data,
    });
  }

  async deactivate(id: number | string, db: PrismaClientLike = prisma) {
    return db.table.update({
      where: {
        id: Number(id),
      },
      data: {
        active: false,
      },
    });
  }
}

export default new TableRepository();
