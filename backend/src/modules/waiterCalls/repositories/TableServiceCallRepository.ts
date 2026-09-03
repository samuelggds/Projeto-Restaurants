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

type ParticipantContextRow = {
  callId: number;
  participantId: number;
  publicId: string;
  displayName: string | null;
  phone: string | null;
};

class TableServiceCallRepository {
  private async enrichParticipantContext<T extends { id: number }>(
    calls: T[],
    restaurantId: number,
    db: PrismaClientLike,
  ) {
    if (!calls.length) return calls;
    const ids = calls.map((call) => call.id);
    const rows = await db.$queryRaw<ParticipantContextRow[]>(Prisma.sql`
      SELECT
        call."id" AS "callId",
        participant."id" AS "participantId",
        participant."publicId",
        participant."displayName",
        state."phone"
      FROM "TableServiceCall" AS call
      JOIN "TableParticipant" AS participant
        ON participant."id" = call."participantId"
       AND participant."restaurantId" = call."restaurantId"
      LEFT JOIN "TableParticipantState" AS state
        ON state."participantId" = participant."id"
       AND state."restaurantId" = participant."restaurantId"
      WHERE call."restaurantId" = ${restaurantId}
        AND call."id" IN (${Prisma.join(ids)})
    `);
    const byCall = new Map(rows.map((row) => [row.callId, row]));
    return calls.map((call) => {
      const participant = byCall.get(call.id);
      return participant
        ? {
            ...call,
            participant: {
              id: participant.participantId,
              publicId: participant.publicId,
              displayName: participant.displayName,
              phone: participant.phone,
            },
          }
        : call;
    });
  }

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
        status: { in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED] },
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

  async findActiveBillByParticipant(
    restaurantId: number,
    tableSessionId: number,
    participantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const rows = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT "id"
      FROM "TableServiceCall"
      WHERE "restaurantId" = ${restaurantId}
        AND "tableSessionId" = ${tableSessionId}
        AND "participantId" = ${participantId}
        AND "type" = ${TableServiceCallType.BILL}::"TableServiceCallType"
        AND "status" IN (
          ${TableServiceCallStatus.WAITING}::"TableServiceCallStatus",
          ${TableServiceCallStatus.IN_PROGRESS}::"TableServiceCallStatus"
        )
      ORDER BY "requestedAt" ASC
      LIMIT 1
    `);
    if (!rows[0]) return null;
    return this.findByIdForRestaurant(rows[0].id, restaurantId, db);
  }

  async createBillForParticipant(
    input: {
      restaurantId: number;
      tableId: number;
      tableSessionId: number;
      participantId: number;
    },
    db: Prisma.TransactionClient,
  ) {
    const rows = await db.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      INSERT INTO "TableServiceCall" (
        "restaurantId", "tableId", "tableSessionId", "participantId", "type", "status",
        "requestedAt", "createdAt", "updatedAt"
      ) VALUES (
        ${input.restaurantId}, ${input.tableId}, ${input.tableSessionId}, ${input.participantId},
        ${TableServiceCallType.BILL}::"TableServiceCallType",
        ${TableServiceCallStatus.WAITING}::"TableServiceCallStatus",
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING "id"
    `);
    return this.findByIdForRestaurant(rows[0].id, input.restaurantId, db);
  }

  async create(data: Prisma.TableServiceCallUncheckedCreateInput, db: PrismaClientLike = prisma) {
    return db.tableServiceCall.create({ data, include: callInclude });
  }

  async findByIdForRestaurant(id: number, restaurantId: number, db: PrismaClientLike = prisma) {
    const call = await db.tableServiceCall.findFirst({
      where: { id, restaurantId },
      include: callInclude,
    });
    if (!call) return null;
    const [enriched] = await this.enrichParticipantContext([call], restaurantId, db);
    return enriched;
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
            {
              status: { in: [TableServiceCallStatus.WAITING, TableServiceCallStatus.IN_PROGRESS] },
            },
            {
              status: TableServiceCallStatus.RESOLVED,
              resolvedAt: { gte: filters.resolvedSince || new Date(0) },
            },
          ],
        };

    const calls = await db.tableServiceCall.findMany({
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
    return this.enrichParticipantContext(calls, restaurantId, db);
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

  async deleteResolved(id: number, restaurantId: number, db: PrismaClientLike = prisma) {
    const result = await db.tableServiceCall.deleteMany({
      where: { id, restaurantId, status: TableServiceCallStatus.RESOLVED },
    });
    return result.count;
  }

  async listActiveBySession(
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const calls = await db.tableServiceCall.findMany({
      where: {
        tableSessionId,
        restaurantId,
        status: { in: [TableServiceCallStatus.WAITING, TableServiceCallStatus.IN_PROGRESS] },
      },
      include: callInclude,
    });
    return this.enrichParticipantContext(calls, restaurantId, db);
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
