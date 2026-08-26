import { Prisma, TableParticipantStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

const participantSelect = {
  id: true,
  publicId: true,
  restaurantId: true,
  tableSessionId: true,
  userId: true,
  displayName: true,
  tokenExpiresAt: true,
  status: true,
  joinedAt: true,
  leftAt: true,
  revokedAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TableParticipantSelect;

export class TableParticipantRepository {
  async findGuestByTokenHash(
    guestTokenHash: string,
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableParticipant.findFirst({
      where: {
        guestTokenHash,
        tableSessionId,
        restaurantId,
        userId: null,
        status: TableParticipantStatus.ACTIVE,
        revokedAt: null,
        tokenExpiresAt: { gt: new Date() },
      },
      select: participantSelect,
    });
  }

  async findByUser(
    userId: number,
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableParticipant.findFirst({
      where: {
        userId,
        tableSessionId,
        restaurantId,
        status: TableParticipantStatus.ACTIVE,
        revokedAt: null,
      },
      select: participantSelect,
    });
  }

  async createGuest(
    data: {
      publicId: string;
      restaurantId: number;
      tableSessionId: number;
      displayName?: string | null;
      guestTokenHash: string;
      tokenExpiresAt: Date;
    },
    db: PrismaClientLike = prisma,
  ) {
    return db.tableParticipant.create({
      data,
      select: participantSelect,
    });
  }

  async upsertAuthenticated(
    data: {
      publicId: string;
      restaurantId: number;
      tableSessionId: number;
      userId: number;
      displayName?: string | null;
    },
    db: PrismaClientLike = prisma,
  ) {
    return db.tableParticipant.upsert({
      where: {
        tableSessionId_userId: {
          tableSessionId: data.tableSessionId,
          userId: data.userId,
        },
      },
      create: data,
      update: {
        displayName: data.displayName,
        status: TableParticipantStatus.ACTIVE,
        leftAt: null,
        revokedAt: null,
      },
      select: participantSelect,
    });
  }

  async linkGuestToUser(
    guestParticipantId: number,
    userId: number,
    displayName: string | null | undefined,
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableParticipant.update({
      where: {
        id: guestParticipantId,
        tableSessionId,
        restaurantId,
        status: TableParticipantStatus.ACTIVE,
        revokedAt: null,
      },
      data: {
        userId,
        displayName,
        guestTokenHash: null,
        tokenExpiresAt: null,
      },
      select: participantSelect,
    });
  }

  async revoke(
    participantId: number,
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const now = new Date();
    return db.tableParticipant.updateMany({
      where: {
        id: participantId,
        tableSessionId,
        restaurantId,
        status: TableParticipantStatus.ACTIVE,
      },
      data: {
        status: TableParticipantStatus.LEFT,
        leftAt: now,
        revokedAt: now,
        tokenExpiresAt: now,
      },
    });
  }

  async revokeActiveBySession(
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const now = new Date();
    return db.tableParticipant.updateMany({
      where: {
        tableSessionId,
        restaurantId,
        status: TableParticipantStatus.ACTIVE,
      },
      data: {
        status: TableParticipantStatus.LEFT,
        leftAt: now,
        revokedAt: now,
        tokenExpiresAt: now,
      },
    });
  }

  async updateDisplayName(
    participantId: number,
    tableSessionId: number,
    restaurantId: number,
    displayName: string | null,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableParticipant.update({
      where: {
        id: participantId,
        tableSessionId,
        restaurantId,
        status: TableParticipantStatus.ACTIVE,
        revokedAt: null,
      },
      data: { displayName },
      select: participantSelect,
    });
  }

  async attachUserToOwnedOrders(
    participantId: number,
    userId: number,
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.order.updateMany({
      where: {
        participantId,
        tableSessionId,
        restaurantId,
      },
      data: { userId },
    });
  }

  async transferOwnedTableData(
    sourceParticipantId: number,
    targetParticipantId: number,
    targetUserId: number,
    tableSessionId: number,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    const orders = await db.order.updateMany({
      where: {
        participantId: sourceParticipantId,
        tableSessionId,
        restaurantId,
      },
      data: {
        participantId: targetParticipantId,
        userId: targetUserId,
      },
    });
    const orderItems = await db.orderItem.updateMany({
      where: {
        participantId: sourceParticipantId,
        tableSessionId,
        restaurantId,
      },
      data: { participantId: targetParticipantId },
    });

    return {
      orders: orders.count,
      orderItems: orderItems.count,
    };
  }
}

export default new TableParticipantRepository();
