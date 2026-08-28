import type { SupportChatSenderRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';

export type LatestSupportConversationRow = {
  id: number;
  restaurantId: number;
  restaurantName: string;
  message: string;
  subject: string;
  senderRole: SupportChatSenderRole;
  sentAt: Date;
  messageCount: number;
};

export class SupportConversationRepository {
  listLatest() {
    return prisma.$queryRaw<LatestSupportConversationRow[]>`
      WITH ranked_messages AS (
        SELECT
          message."id",
          message."restaurantId",
          message."message",
          FIRST_VALUE(message."message") OVER (
            PARTITION BY message."restaurantId"
            ORDER BY message."sentAt" ASC, message."id" ASC
          ) AS "subject",
          message."senderRole",
          message."sentAt",
          ROW_NUMBER() OVER (
            PARTITION BY message."restaurantId"
            ORDER BY message."sentAt" DESC, message."id" DESC
          ) AS position,
          (COUNT(*) OVER (PARTITION BY message."restaurantId"))::integer AS "messageCount"
        FROM "SupportChatMessage" AS message
      )
      SELECT
        ranked."id",
        ranked."restaurantId",
        restaurant."name" AS "restaurantName",
        ranked."message",
        ranked."subject",
        ranked."senderRole",
        ranked."sentAt",
        ranked."messageCount"
      FROM ranked_messages AS ranked
      INNER JOIN "Restaurant" AS restaurant ON restaurant."id" = ranked."restaurantId"
      WHERE ranked.position = 1
      ORDER BY ranked."sentAt" DESC, ranked."id" DESC
      LIMIT 100
    `;
  }
}

export default new SupportConversationRepository();
