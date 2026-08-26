import { Prisma, TableParticipantStatus, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { tablePaymentIntentAdminSelect } from './TablePaymentRepository.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const activeSessionStatuses = [
  TableSessionStatus.OPEN,
  TableSessionStatus.CLOSING_REQUESTED,
] as const;

const tableAccountSnapshotSelect = {
  id: true,
  publicId: true,
  restaurantId: true,
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
      paymentAllocations: {
        select: {
          amountCents: true,
          paymentIntent: {
            select: {
              status: true,
              expiresAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { orderItemId: 'asc' }, { unitIndex: 'asc' }],
  },
  paymentIntents: {
    select: tablePaymentIntentAdminSelect,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  },
} satisfies Prisma.TableSessionSelect;

export type TableAccountSnapshotRecord = Prisma.TableSessionGetPayload<{
  select: typeof tableAccountSnapshotSelect;
}>;

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
      select: tableAccountSnapshotSelect,
    });
  }

  async findAdminSnapshotData(
    sessionPublicId: string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableSession.findFirst({
      where: {
        publicId: sessionPublicId,
        restaurantId,
      },
      select: tableAccountSnapshotSelect,
    });
  }
}

export default new TableAccountRepository();
