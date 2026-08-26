import { tableParticipantIdentityInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';

type Input = {
  participantId: number;
  tableSessionId: number;
  restaurantId: number;
  displayName: unknown;
};

export class UpdateTableParticipantService {
  async execute({ participantId, tableSessionId, restaurantId, displayName }: Input) {
    const identity = tableParticipantIdentityInputSchema.parse({ displayName });
    if (identity.displayName === undefined) {
      throw new Error('Informe o nome que deseja usar nesta mesa.');
    }

    const participant = await tableParticipantRepository.updateDisplayName(
      participantId,
      tableSessionId,
      restaurantId,
      identity.displayName,
    );

    return {
      publicId: participant.publicId,
      displayName: participant.displayName || participant.user?.name || null,
      authenticated: Boolean(participant.userId),
      status: participant.status,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
    };
  }
}

export default new UpdateTableParticipantService();
