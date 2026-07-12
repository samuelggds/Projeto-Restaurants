import prisma from "../../../config/prisma.js";
class ListSupportChatMessagesService {
    async execute(input) {
        const normalizedRole = String(input.requesterRole || "").toUpperCase();
        const isAdmin = normalizedRole === "ADMIN";
        const isSuperAdmin = normalizedRole === "SUPER_ADMIN";
        if (!isAdmin && !isSuperAdmin) {
            throw new Error("Sem permissão para acessar o chat de suporte.");
        }
        const requesterRestaurantId = Number(input.requesterRestaurantId || 0);
        const queryRestaurantId = Number(input.queryRestaurantId || 0);
        const restaurantId = isSuperAdmin
            ? queryRestaurantId
            : requesterRestaurantId;
        const beforeId = Number(input.queryBeforeId || 0);
        const requestedLimit = Number(input.queryLimit || 0);
        const limit = Number.isInteger(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 100)
            : 40;
        if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
            throw new Error("Restaurante inválido para carregar histórico.");
        }
        const messages = await prisma.$queryRaw `
      SELECT
        "id",
        "message",
        "senderRole",
        "senderUserId",
        "senderLabel",
        "restaurantId",
        "sentAt"
      FROM "SupportChatMessage"
      WHERE
        "restaurantId" = ${restaurantId}
        AND (${beforeId} <= 0 OR "id" < ${beforeId})
      ORDER BY "id" DESC
      LIMIT ${limit + 1}
    `;
        const hasMore = messages.length > limit;
        const slicedMessages = hasMore ? messages.slice(0, limit) : messages;
        const oldestMessage = slicedMessages[slicedMessages.length - 1] || null;
        return {
            restaurantId,
            hasMore,
            nextBeforeId: oldestMessage ? String(oldestMessage.id) : null,
            messages: slicedMessages
                .slice()
                .reverse()
                .map((item) => ({
                id: String(item.id),
                message: item.message,
                senderRole: item.senderRole,
                senderUserId: Number(item.senderUserId || 0) || 0,
                senderLabel: item.senderLabel,
                restaurantId: item.restaurantId,
                sentAt: item.sentAt?.toISOString?.() || null,
            })),
        };
    }
}
export default new ListSupportChatMessagesService();
