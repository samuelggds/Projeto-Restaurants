import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';

export type SupportMessageChannel = 'ALL' | 'PLATFORM' | 'INTERNAL';

export type SupportMessageRow = {
  id: number;
  message: string;
  senderRole: string;
  senderUserId: number | null;
  senderLabel: string;
  issueStatus: string | null;
  issueResponse: string | null;
  issueRespondedAt: Date | null;
  issueClosedAt: Date | null;
  restaurantId: number;
  sentAt: Date;
};

type ListSupportMessagesInput = {
  restaurantId: number;
  beforeId: number;
  limit: number;
  channel: SupportMessageChannel;
};

function channelFilter(channel: SupportMessageChannel) {
  if (channel === 'PLATFORM') {
    return Prisma.sql`
      AND "senderRole" IN (
        'ADMIN'::"SupportChatSenderRole",
        'SUPER_ADMIN'::"SupportChatSenderRole"
      )
    `;
  }

  if (channel === 'INTERNAL') {
    return Prisma.sql`
      AND "issueStatus" IS NOT NULL
      AND "senderRole" IN (
        'FUNCIONARIO'::"SupportChatSenderRole",
        'MOTOQUEIRO'::"SupportChatSenderRole"
      )
    `;
  }

  return Prisma.empty;
}

export class SupportMessageRepository {
  listForRestaurant(input: ListSupportMessagesInput) {
    return prisma.$queryRaw<SupportMessageRow[]>(Prisma.sql`
      SELECT
        "id",
        "message",
        "senderRole",
        "senderUserId",
        "senderLabel",
        "issueStatus",
        "issueResponse",
        "issueRespondedAt",
        "issueClosedAt",
        "restaurantId",
        "sentAt"
      FROM "SupportChatMessage"
      WHERE
        "restaurantId" = ${input.restaurantId}
        ${channelFilter(input.channel)}
        AND (${input.beforeId} <= 0 OR "id" < ${input.beforeId})
      ORDER BY "id" DESC
      LIMIT ${input.limit}
    `);
  }
}

export default new SupportMessageRepository();
