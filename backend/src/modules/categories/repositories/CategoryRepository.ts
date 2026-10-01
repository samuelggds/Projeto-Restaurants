import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class CategoryRepository {
  async create(
    data: Omit<Prisma.CategoryUncheckedCreateInput, 'restaurantId'>,
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
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    });
  }

  async nextSortOrder(restaurantId: number, db: PrismaClientLike = prisma) {
    const aggregate = await db.category.aggregate({
      where: { restaurantId },
      _max: { sortOrder: true },
    });
    return Number(aggregate._max.sortOrder ?? -1) + 1;
  }

  async reorder(categoryIds: number[], restaurantId: number) {
    return prisma.$transaction(async (db) => {
      const categories = await this.findAll(restaurantId, db);
      const tenantIds = new Set(categories.map((category) => category.id));

      if (
        categories.length !== categoryIds.length ||
        categoryIds.some((categoryId) => !tenantIds.has(categoryId))
      ) {
        throw new Error('A ordem informada contém categorias que não pertencem a este restaurante.');
      }

      for (const [sortOrder, categoryId] of categoryIds.entries()) {
        const updated = await db.category.updateMany({
          where: { id: categoryId, restaurantId },
          data: { sortOrder },
        });
        if (updated.count !== 1) {
          throw new Error('Não foi possível salvar a ordem das categorias.');
        }
      }

      return this.findAll(restaurantId, db);
    });
  }

  async findById(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
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
          equals: String(name || '').trim(),
          mode: 'insensitive',
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

  async delete(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const categoryId = Number(id);

    const hasProducts = await db.product.findFirst({
      where: {
        categoryId,
        restaurantId,
      },
    });
    if (hasProducts) {
      throw new Error('Não é possivel excluir uma categoria que possui produtos!');
    }
    return db.category.deleteMany({
      where: {
        id: categoryId,
        restaurantId,
      },
    });
  }

  async deleteAllByRestaurant(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.category.deleteMany({
      where: {
        restaurantId,
      },
    });
  }
}

export default new CategoryRepository();
