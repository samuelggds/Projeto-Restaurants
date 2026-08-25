import type { Prisma } from '@prisma/client';
import { OrderStatus, PaymentMethod, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

class TableRepository {
  async create(data: Prisma.TableUncheckedCreateInput, db: PrismaClientLike = prisma) {
    return db.table.create({
      data,
    });
  }

  async findById(id: number | string, db: PrismaClientLike = prisma) {
    return db.table.findUnique({
      where: {
        id: Number(id),
      },
    });
  }

  async findByIdForRestaurant(
    id: number | string,
    restaurantId: number | string,
    db: PrismaClientLike = prisma,
  ) {
    return db.table.findFirst({
      where: {
        id: Number(id),
        restaurantId: Number(restaurantId),
      },
    });
  }

  async findByNumber(number: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    return db.table.findFirst({
      where: {
        number: Number(number),
        restaurantId,
      },
    });
  }

  async findPublicByReference(
    {
      number,
      tableToken,
      restaurantId,
      restaurantSlug,
    }: {
      number: number;
      tableToken: string;
      restaurantId?: number;
      restaurantSlug?: string;
    },
    db: PrismaClientLike = prisma,
  ) {
    return db.table.findFirst({
      where: {
        number,
        token: tableToken,
        active: true,
        restaurant: {
          active: true,
          ...(restaurantId ? { id: restaurantId } : {}),
          ...(restaurantSlug ? { slug: restaurantSlug } : {}),
        },
      },
      select: {
        id: true,
        number: true,
        restaurantId: true,
        restaurant: {
          select: {
            slug: true,
            settings: {
              select: {
                tableOrderingEnabled: true,
                waiterCallEnabled: true,
                billRequestEnabled: true,
              },
            },
            subscription: {
              select: {
                plan: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllByRestaurant(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.table.findMany({
      where: {
        restaurantId,
      },
      include: {
        tableSessions: {
          where: {
            status: TableSessionStatus.OPEN,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { openedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            openedAt: true,
            expiresAt: true,
            openedBy: { select: { id: true, name: true } },
          },
        },
        orders: {
          where: {
            status: { in: [OrderStatus.PENDENTE, OrderStatus.PREPARANDO, OrderStatus.PRONTO] },
            NOT: {
              paid: false,
              paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
              payOnDelivery: false,
            },
          },
          select: {
            id: true,
            userId: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            orders: true,
            tableSessions: true,
          },
        },
      },
      orderBy: {
        number: 'asc',
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

  async deleteIfUnused(id: number | string, restaurantId: number, db: PrismaClientLike = prisma) {
    const result = await db.table.deleteMany({
      where: {
        id: Number(id),
        restaurantId,
        orders: { none: {} },
        tableSessions: { none: { status: TableSessionStatus.OPEN } },
      },
    });
    return result.count;
  }
}

export default new TableRepository();
