import { Prisma, TableParticipantStatus, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export const tablePaymentIntentDtoSelect = {
  id: true,
  publicId: true,
  restaurantId: true,
  tableSessionId: true,
  payerParticipantId: true,
  selectionMode: true,
  method: true,
  status: true,
  splitCount: true,
  idempotencyKeyHash: true,
  requestFingerprint: true,
  subtotalCents: true,
  serviceFeeCents: true,
  totalCents: true,
  provider: true,
  providerExternalId: true,
  providerCheckoutUrl: true,
  providerPaymentCode: true,
  expiresAt: true,
  processingAt: true,
  paidAt: true,
  failedAt: true,
  canceledAt: true,
  refundedAt: true,
  failureCode: true,
  manualConfirmedById: true,
  manualConfirmedAt: true,
  createdAt: true,
  updatedAt: true,
  payerParticipant: {
    select: {
      publicId: true,
    },
  },
  tableSession: {
    select: {
      publicId: true,
    },
  },
  allocations: {
    select: {
      amountCents: true,
      tableBillItem: {
        select: {
          publicId: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.TablePaymentIntentSelect;

export const tablePaymentIntentAdminSelect = {
  ...tablePaymentIntentDtoSelect,
  manualConfirmedBy: {
    select: {
      name: true,
    },
  },
  events: {
    select: {
      type: true,
      fromStatus: true,
      toStatus: true,
      provider: true,
      providerEventId: true,
      amountCents: true,
      metadata: true,
      occurredAt: true,
      actorUser: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.TablePaymentIntentSelect;

export type TablePaymentIntentRecord = Prisma.TablePaymentIntentGetPayload<{
  select: typeof tablePaymentIntentDtoSelect;
}>;

export type TablePaymentIntentAdminRecord = Prisma.TablePaymentIntentGetPayload<{
  select: typeof tablePaymentIntentAdminSelect;
}>;

export class TablePaymentRepository {
  async findSessionParticipantForPayment(
    tableSessionId: number,
    restaurantId: number,
    participantId: number,
    now: Date,
    db: PrismaClientLike = prisma,
  ) {
    return db.tableSession.findFirst({
      where: {
        id: tableSessionId,
        restaurantId,
        status: { in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        participants: {
          some: {
            id: participantId,
            restaurantId,
            status: TableParticipantStatus.ACTIVE,
            revokedAt: null,
          },
        },
      },
      select: {
        id: true,
        publicId: true,
        restaurantId: true,
        status: true,
      },
    });
  }

  async findByIdempotencyHash(
    restaurantId: number,
    tableSessionId: number,
    idempotencyKeyHash: string,
    db: PrismaClientLike = prisma,
  ) {
    return db.tablePaymentIntent.findUnique({
      where: {
        restaurantId_tableSessionId_idempotencyKeyHash: {
          restaurantId,
          tableSessionId,
          idempotencyKeyHash,
        },
      },
      select: tablePaymentIntentDtoSelect,
    });
  }

  async findOwnedByPublicId(
    publicId: string,
    restaurantId: number,
    tableSessionId: number,
    participantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tablePaymentIntent.findFirst({
      where: {
        publicId,
        restaurantId,
        tableSessionId,
        payerParticipantId: participantId,
      },
      select: tablePaymentIntentDtoSelect,
    });
  }

  async findForStaffByPublicId(
    publicId: string,
    restaurantId: number,
    db: PrismaClientLike = prisma,
  ) {
    return db.tablePaymentIntent.findFirst({
      where: { publicId, restaurantId },
      select: tablePaymentIntentDtoSelect,
    });
  }
}

export default new TablePaymentRepository();
