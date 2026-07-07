import type { Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.js";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class CategoryRepository {
  async create(
    data: Omit<Prisma.CategoryUncheckedCreateInput, "restaurantId">,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.category.create({
      data: {
        ...data,
        restaurantId,
      },
    });
  }

  async findAll(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.category.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async findById(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.category.findFirst({
      where: {
        id: Number(id),
        restaurantId,
      },
    });
  }

  async findByName(
    name: string | null | undefined,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.category.findFirst({
      where: {
        restaurantId,
        name: {
          equals: String(name || "").trim(),
          mode: "insensitive",
        },
      },
    });
  }

  async update(
    id: number | string,
    data: Prisma.CategoryUpdateManyMutationInput,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.category.updateMany({
      where: {
        id: Number(id),
        restaurantId,
      },
      data,
    });
  }
  async delete(
    id: number | string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const categoryId = Number(id);

    const hasProducts = await db.product.findFirst({
      where: {
        categoryId,
        restaurantId,
      },
    });
    if (hasProducts) {
      throw new Error(
        "Não é possivel excluir uma categoria que possui produtos!",
      );
    }
    return db.category.deleteMany({
      where: {
        id: categoryId,
        restaurantId,
      },
    });
  }
}

export default new CategoryRepository();
