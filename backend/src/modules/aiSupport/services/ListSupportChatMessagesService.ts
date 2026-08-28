import supportMessageRepository, {
  type SupportMessageChannel,
  type SupportMessageRepository,
} from '../repositories/SupportMessageRepository.js';

type ExecuteInput = {
  requesterRole: string;
  requesterRestaurantId: number | string | null;
  queryRestaurantId: number | string | null;
  queryBeforeId: number | string | null;
  queryLimit: number | string | null;
  queryChannel: string | null;
};

export class ListSupportChatMessagesService {
  constructor(
    private readonly repository: Pick<
      SupportMessageRepository,
      'listForRestaurant'
    > = supportMessageRepository,
  ) {}

  async execute(input: ExecuteInput) {
    const normalizedRole = String(input.requesterRole || '').toUpperCase();
    const isAdmin = normalizedRole === 'ADMIN';
    const isSuperAdmin = normalizedRole === 'SUPER_ADMIN';

    if (!isAdmin && !isSuperAdmin) {
      throw new Error('Sem permissão para acessar o chat de suporte.');
    }

    const requesterRestaurantId = Number(input.requesterRestaurantId || 0);
    const queryRestaurantId = Number(input.queryRestaurantId || 0);

    const restaurantId = isSuperAdmin ? queryRestaurantId : requesterRestaurantId;
    const beforeId = Number(input.queryBeforeId || 0);
    const requestedLimit = Number(input.queryLimit || 0);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(Math.max(requestedLimit, 1), 100)
        : 40;
    const requestedChannel = String(input.queryChannel || 'ALL').toUpperCase();
    if (!['ALL', 'PLATFORM', 'INTERNAL'].includes(requestedChannel)) {
      throw new Error('Canal de suporte inválido.');
    }
    // SUPER_ADMIN nunca recebe relatos operacionais da equipe. Esses relatos
    // pertencem exclusivamente ao ADMIN do restaurante.
    const channel: SupportMessageChannel = isSuperAdmin
      ? 'PLATFORM'
      : (requestedChannel as SupportMessageChannel);

    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error('Restaurante inválido para carregar histórico.');
    }

    const messages = await this.repository.listForRestaurant({
      restaurantId,
      beforeId: Number.isInteger(beforeId) ? beforeId : 0,
      limit: limit + 1,
      channel,
    });

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
          issueStatus: item.issueStatus,
          issueResponse: item.issueResponse,
          issueRespondedAt: item.issueRespondedAt?.toISOString?.() || null,
          issueClosedAt: item.issueClosedAt?.toISOString?.() || null,
          restaurantId: item.restaurantId,
          sentAt: item.sentAt?.toISOString?.() || null,
        })),
    };
  }
}

export default new ListSupportChatMessagesService();
