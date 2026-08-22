import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class IngredientRepository {
  async findAll(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.ingredient.findMany({
      where: { restaurantId },
      orderBy: [{ category: 'asc' }, { active: 'desc' }, { name: 'asc' }],
    });
  }

  async findById(id: number, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.ingredient.findFirst({ where: { id, restaurantId } });
  }

  async findByName(name: string, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.ingredient.findFirst({
      where: {
        restaurantId,
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });
  }

  async create(
    data: Omit<Prisma.IngredientUncheckedCreateInput, 'restaurantId'>,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.ingredient.create({ data: { ...data, restaurantId } });
  }

  async update(
    id: number,
    data: Prisma.IngredientUpdateManyMutationInput,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    await db.ingredient.updateMany({ where: { id, restaurantId }, data });
    return this.findById(id, restaurantId, db);
  }

  async delete(id: number, restaurantId: number, db: PrismaClientLike = prisma) {
    const usedByProduct = await db.productOption.findFirst({
      where: {
        ingredientId: id,
        group: { restaurantId },
      },
      select: { id: true },
    });

    if (usedByProduct) {
      throw new Error(
        'Este ingrediente está vinculado a um produto. Remova-o dos grupos ou desative-o.',
      );
    }

    return db.ingredient.deleteMany({ where: { id, restaurantId } });
  }
}

export default new IngredientRepository();
