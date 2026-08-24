import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { OrderStatus, TableSessionStatus } from '@prisma/client';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const operationalTableSelect = {
  id: true,
  number: true,
  active: true,
  restaurantId: true,
} satisfies Prisma.TableSelect;

class TableSessionRepository {
  async create(data: Prisma.TableSessionUncheckedCreateInput, db: PrismaClientLike = prisma) {
    return db.tableSession.create({
      data,
      include: {
        table: { select: operationalTableSelect },
        openedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOpenedByTable(tableId: number | string, db: PrismaClientLike = prisma) {
    return db.tableSession.findFirst({
      where: {
        tableId: Number(tableId),
        status: TableSessionStatus.OPEN,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        table: { select: operationalTableSelect },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async findLatestOpenByTable(tableId: number | string, db: PrismaClientLike = prisma) {
    return db.tableSession.findFirst({
      where: {
        tableId: Number(tableId),
        status: TableSessionStatus.OPEN,
      },
      include: { table: { select: operationalTableSelect } },
      orderBy: { openedAt: 'desc' },
    });
  }

  async listExpiredOpenByTable(tableId: number | string, db: PrismaClientLike = prisma) {
    return db.tableSession.findMany({
      where: {
        tableId: Number(tableId),
        status: TableSessionStatus.OPEN,
        expiresAt: { lte: new Date() },
      },
      include: { table: { select: operationalTableSelect } },
      orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
    });
  }

  async findById(id: number | string, db: PrismaClientLike = prisma) {
    return db.tableSession.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        table: { select: operationalTableSelect },
      },
    });
  }

  async findBySessionToken(sessionToken: string, db: PrismaClientLike = prisma) {
    return db.tableSession.findFirst({
      where: {
        sessionToken,
        status: TableSessionStatus.OPEN,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        table: { select: operationalTableSelect },
      },
    });
  }
  async close(id: number | string, closedById: number | null, db: PrismaClientLike = prisma) {
    return db.tableSession.update({
      where: {
        id: Number(id),
      },
      data: {
        status: TableSessionStatus.CLOSED,
        closedById,
        closedAt: new Date(),
      },
    });
  }
  async listOpenByRestaurant(restaurantId: number, db: PrismaClientLike = prisma) {
    return db.tableSession.findMany({
      where: {
        status: TableSessionStatus.OPEN,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        table: {
          restaurantId,
        },
      },
      select: {
        id: true,
        tableId: true,
        status: true,
        openedAt: true,
        expiresAt: true,
        table: { select: { id: true, number: true, active: true, restaurantId: true } },
        openedBy: { select: { id: true, name: true } },
      },
      orderBy: {
        openedAt: 'desc',
      },
    });
  }

  async findBlockingOrdersForSession(
    tableId: number,
    restaurantId: number,
    openedAt: Date,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.findMany({
      where: {
        tableId,
        restaurantId,
        createdAt: { gte: openedAt },
        status: { not: OrderStatus.CANCELADO },
        OR: [{ status: { not: OrderStatus.ENTREGUE } }, { paid: false }],
      },
      select: {
        id: true,
        status: true,
        paid: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export default new TableSessionRepository();
