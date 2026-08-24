import {
  Prisma,
  TableServiceCallStatus,
  TableServiceCallType,
  TableSessionStatus,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const callInclude = {
  table: {
    select: {
      id: true,
      number: true,
      active: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
    },
  },
  resolvedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TableServiceCallInclude;

class TableServiceCallRepository {
  async findOpenSessionContext(
    sessionId: number,
    tableId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableSession.findFirst({
      where: {
        id: sessionId,
        tableId,
        status: TableSessionStatus.OPEN,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        table: {
          restaurantId,
          active: true,
          restaurant: { active: true },
        },
      },
      select: {
        id: true,
        tableId: true,
        table: {
          select: {
            id: true,
            number: true,
            restaurantId: true,
            restaurant: {
              select: {
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
        },
      },
    });
  }

  async findActiveByTableAndType(
    restaurantId: number,
    tableId: number,
    type: TableServiceCallType,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableServiceCall.findFirst({
      where: {
        restaurantId,
        tableId,
        type,
        status: { in: [TableServiceCallStatus.WAITING, TableServiceCallStatus.IN_PROGRESS] },
      },
      include: callInclude,
      orderBy: { requestedAt: 'asc' },
    });
  }

  async create(
    data: Prisma.TableServiceCallUncheckedCreateInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableServiceCall.create({ data, include: callInclude });
  }

  async findByIdForRestaurant(
    id: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableServiceCall.findFirst({
      where: { id, restaurantId },
      include: callInclude,
    });
  }

  async listByRestaurant(
    restaurantId: number,
    filters: {
      status?: TableServiceCallStatus;
      type?: TableServiceCallType;
      tableNumber?: number;
      resolvedSince?: Date;
      take?: number;
    } = {},
    db: PrismaClientLike = prisma,
  ) {
    const statusFilter = filters.status
      ? { status: filters.status }
      : {
          OR: [
            { status: { in: [TableServiceCallStatus.WAITING, TableServiceCallStatus.IN_PROGRESS] } },
            {
              status: TableServiceCallStatus.RESOLVED,
              resolvedAt: { gte: filters.resolvedSince || new Date(0) },
            },
          ],
        };

    return db.tableServiceCall.findMany({
      where: {
        restaurantId,
        ...statusFilter,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.tableNumber ? { table: { number: filters.tableNumber } } : {}),
      },
      include: callInclude,
      orderBy: [{ status: 'asc' }, { requestedAt: 'asc' }],
      take: filters.take || 200,
    });
  }

  async assignIfWaiting(
    id: number,
    restaurantId: number,
    assignedToId: number,
    db: PrismaClientLike = prisma,
  ) {
    const result = await db.tableServiceCall.updateMany({
      where: { id, restaurantId, status: TableServiceCallStatus.WAITING },
      data: {
        status: TableServiceCallStatus.IN_PROGRESS,
        assignedToId,
        assignedAt: new Date(),
      },
    });
    return result.count;
  }

  async resolveIfInProgress(
    id: number,
    restaurantId: number,
    resolvedById: number,
    db: PrismaClientLike = prisma,
  ) {
    const result = await db.tableServiceCall.updateMany({
      where: { id, restaurantId, status: TableServiceCallStatus.IN_PROGRESS },
      data: {
        status: TableServiceCallStatus.RESOLVED,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
    return result.count;
  }

  async listActiveBySession(
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableServiceCall.findMany({
      where: {
        tableSessionId,
        restaurantId,
        status: { in: [TableServiceCallStatus.WAITING, TableServiceCallStatus.IN_PROGRESS] },
      },
      include: callInclude,
    });
  }

  async resolveActiveBySession(
    tableSessionId: number,
    restaurantId: number,
    resolvedById: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableServiceCall.updateMany({
      where: {
        tableSessionId,
        restaurantId,
        status: { in: [TableServiceCallStatus.WAITING, TableServiceCallStatus.IN_PROGRESS] },
      },
      data: {
        status: TableServiceCallStatus.RESOLVED,
        resolvedById,
        resolvedAt: new Date(),
      },
    });
  }

}

export default new TableServiceCallRepository();
