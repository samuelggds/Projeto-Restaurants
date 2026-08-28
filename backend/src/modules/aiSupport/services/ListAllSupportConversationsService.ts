import { deriveSupportConversationStatus } from '../domain/supportConversation.js';
import supportConversationRepository, {
  type SupportConversationRepository,
} from '../repositories/SupportConversationRepository.js';

export class ListAllSupportConversationsService {
  constructor(
    private readonly repository: Pick<
      SupportConversationRepository,
      'listLatest'
    > = supportConversationRepository,
  ) {}

  async execute() {
    const conversations = await this.repository.listLatest();
    return conversations.map((conversation) => ({
      id: conversation.id,
      restaurantId: conversation.restaurantId,
      restaurant: conversation.restaurantName,
      subject: conversation.subject.slice(0, 100),
      status: deriveSupportConversationStatus(conversation.senderRole),
      messageCount: Number(conversation.messageCount),
      lastMessageAt: conversation.sentAt.toISOString(),
      lastSenderRole: conversation.senderRole,
    }));
  }
}

export default new ListAllSupportConversationsService();
