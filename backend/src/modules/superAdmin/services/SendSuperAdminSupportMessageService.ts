import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { notFound, SuperAdminError } from '../domain/superAdminErrors.js';
import { supportMessageSchema, type SupportMessageInput } from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { realtimePublisher } from '../../../realtime/realtimePublisher.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';

function parseRestaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
  }
  return id;
}

export class SendSuperAdminSupportMessageService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(restaurantIdValue: unknown, payload: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const parsed = parseSuperAdminPayload<SupportMessageInput>(supportMessageSchema, payload);

    const saved = await this.repository.transaction(async (transaction) => {
      const actor = await requireSuperAdminActor(this.repository, context, transaction);
      const restaurant = await this.repository.findRestaurantForMutation(restaurantId, transaction);
      if (!restaurant) throw notFound('Restaurante não encontrado.');

      const message = await this.repository.createSupportMessage(
        {
          restaurantId,
          senderUserId: actor.id,
          senderLabel: actor.name,
          message: parsed.message,
        },
        transaction,
      );

      await this.repository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: 'SEND_SUPPORT_MESSAGE',
          resource: `SupportChatMessage:${message.id}`,
          metadata: buildAuditMetadata({
            before: null,
            after: {
              id: message.id,
              restaurantId,
              senderRole: message.senderRole,
              messageLength: message.message.length,
            },
          }),
        },
        transaction,
      );

      return message;
    });

    const response = {
      id: saved.id,
      restaurantId: saved.restaurantId,
      senderUserId: saved.senderUserId,
      senderRole: saved.senderRole,
      senderLabel: saved.senderLabel,
      message: saved.message,
      sentAt: saved.sentAt.toISOString(),
    };
    realtimePublisher.to(`restaurant:${restaurantId}:admin`).emit('support:chat-message', response);
    realtimePublisher.to('super_admin').emit('support:chat-message', response);
    return response;
  }
}

export default new SendSuperAdminSupportMessageService();

