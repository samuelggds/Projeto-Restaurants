import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { notFound, SuperAdminError } from '../domain/superAdminErrors.js';
import {
  restaurantAccessUpdateSchema,
  type RestaurantAccessUpdateInput,
} from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';

function parseRestaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
  }
  return id;
}

export class UpdateRestaurantAccessService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(restaurantIdValue: unknown, payload: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const parsed = parseSuperAdminPayload<RestaurantAccessUpdateInput>(
      restaurantAccessUpdateSchema,
      payload,
    );

    return this.repository.transaction(async (transaction) => {
      const actor = await requireSuperAdminActor(this.repository, context, transaction);
      const before = await this.repository.findRestaurantForMutation(restaurantId, transaction);
      if (!before) throw notFound('Restaurante não encontrado.');

      const after = await this.repository.updateRestaurantAccess(
        restaurantId,
        parsed.active,
        transaction,
      );
      if (!parsed.active) {
        await this.repository.revokeRestaurantSessions(restaurantId, transaction);
      }

      await this.repository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId,
          restaurantName: before.name,
          action: parsed.active ? 'UNBLOCK_RESTAURANT_ACCESS' : 'BLOCK_RESTAURANT_ACCESS',
          resource: `Restaurant:${restaurantId}`,
          metadata: buildAuditMetadata({
            reason: parsed.reason,
            before,
            after,
          }),
        },
        transaction,
      );

      return {
        id: after.id,
        name: after.name,
        active: after.active,
        updatedAt: after.updatedAt.toISOString(),
      };
    });
  }
}

export default new UpdateRestaurantAccessService();

