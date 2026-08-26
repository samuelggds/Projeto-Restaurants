import { Prisma, TableParticipantStatus, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const activeSessionStatuses = [
  TableSessionStatus.OPEN,
  TableSessionStatus.CLOSING_REQUESTED,
] as const;

export class TableAccountRepository {
  async findSessionContextByPublicId(publicId: string, db: PrismaClientLike = prisma) {
    return db.tableSession.findFirst({
      where: {
        publicId,
        status: { in: [...activeSessionStatuses] },
      },
      select: {
        id: true,
        publicId: true,
        tableId: true,
        restaurantId: true,
        status: true,
        expiresAt: true,
      },
    });
  }

  async findSnapshotData(
    tableSessionId: number,
    restaurantId: number,
    currentParticipantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableSession.findFirst({
      where: {
        id: tableSessionId,
        restaurantId,
        status: { in: [...activeSessionStatuses] },
        participants: {
          some: {
            id: currentParticipantId,
            restaurantId,
            status: TableParticipantStatus.ACTIVE,
            revokedAt: null,
          },
        },
      },
      select: {
        publicId: true,
        status: true,
        table: { select: { number: true } },
        participants: {
          select: {
            publicId: true,
            displayName: true,
            status: true,
            joinedAt: true,
            leftAt: true,
          },
          orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        },
        billItems: {
          select: {
            publicId: true,
            productName: true,
            unitIndex: true,
            unitPriceCents: true,
            financialStatus: true,
            canceledAt: true,
            order: {
              select: {
                publicId: true,
                status: true,
                paid: true,
                refundStatus: true,
              },
            },
            participant: {
              select: {
                publicId: true,
                displayName: true,
              },
            },
          },
          orderBy: [{ createdAt: 'asc' }, { orderItemId: 'asc' }, { unitIndex: 'asc' }],
        },
      },
    });
  }
}

export default new TableAccountRepository();
