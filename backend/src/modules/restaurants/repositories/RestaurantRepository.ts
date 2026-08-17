import type { Prisma } from '@prisma/client';
import { UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class RestaurantRepository {
  async findByEmail(email: string, db: PrismaClientLike = prisma) {
    return db.restaurant.findUnique({
      where: { email },
    });
  }

  async findBySlug(slug: string, db: PrismaClientLike = prisma) {
    return db.restaurant.findUnique({
      where: { slug },
    });
  }

  async create(data: Prisma.RestaurantUncheckedCreateInput, db: PrismaClientLike = prisma) {
    return db.restaurant.create({
      data,
    });
  }

  async listAll(db: PrismaClientLike = prisma) {
    return db.restaurant.findMany({
      include: {
        users: {
          where: { role: UserRole.ADMIN },
          select: {
            id: true,
            name: true,
            email: true,
          },
          take: 1,
        },
        subscription: {
          select: {
            id: true,
            plan: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export default new RestaurantRepository();
