import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { notFound, SuperAdminError } from '../domain/superAdminErrors.js';
import {
  administratorAccessUpdateSchema,
  type AdministratorAccessUpdateInput,
} from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { presentAdministrator } from './superAdminPresenters.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';

function parseAdministratorId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Administrador inválido.', 400, 'INVALID_ADMINISTRATOR');
  }
  return id;
}

export class UpdateAdministratorAccessService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(administratorIdValue: unknown, payload: unknown, context: AuditContext) {
    const administratorId = parseAdministratorId(administratorIdValue);
    const parsed = parseSuperAdminPayload<AdministratorAccessUpdateInput>(
      administratorAccessUpdateSchema,
      payload,
    );

    return this.repository.transaction(async (transaction) => {
      const actor = await requireSuperAdminActor(this.repository, context, transaction);
      const before = await this.repository.findAdministrator(administratorId, transaction);
      if (!before) throw notFound('Administrador de restaurante não encontrado.');

      const after = await this.repository.updateAdministratorAccess(
        administratorId,
        parsed.active,
        transaction,
      );
      if (!parsed.active) {
        await this.repository.revokeUserSessions(administratorId, transaction);
      }

      await this.repository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId: before.restaurantId,
          restaurantName: before.restaurant?.name,
          action: parsed.active ? 'UNBLOCK_RESTAURANT_ADMIN' : 'BLOCK_RESTAURANT_ADMIN',
          resource: `User:${administratorId}`,
          metadata: buildAuditMetadata({
            reason: parsed.reason,
            before: { id: before.id, email: before.email, active: before.active },
            after: { id: after.id, email: after.email, active: after.active },
          }),
        },
        transaction,
      );

      return presentAdministrator(after, before.restaurant?.name);
    });
  }
}

export default new UpdateAdministratorAccessService();

