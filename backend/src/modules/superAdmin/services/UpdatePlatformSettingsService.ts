import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { conflict, notFound } from '../domain/superAdminErrors.js';
import {
  platformSettingsUpdateSchema,
  type PlatformSettingsUpdateInput,
} from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { presentPlatformSettings } from './superAdminPresenters.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';
import { platformMaintenanceStateService } from '../../platform/services/PlatformMaintenanceService.js';

export class UpdatePlatformSettingsService {
  constructor(
    private readonly repository: SuperAdminRepository = superAdminRepository,
    private readonly maintenanceState: Pick<
      typeof platformMaintenanceStateService,
      'invalidate'
    > = platformMaintenanceStateService,
  ) {}

  async execute(payload: unknown, context: AuditContext) {
    const parsed = parseSuperAdminPayload<PlatformSettingsUpdateInput>(
      platformSettingsUpdateSchema,
      payload,
    );
    const { version, ...changes } = parsed;

    const result = await this.repository.transaction(async (transaction) => {
      const actor = await requireSuperAdminActor(this.repository, context, transaction);
      const before = await this.repository.findSettings(transaction);
      if (!before) throw notFound('Configurações da plataforma não encontradas.');

      const updated = await this.repository.updateSettingsIfVersion(
        version,
        {
          ...changes,
          version: { increment: 1 },
          updatedByUserId: actor.id,
        },
        transaction,
      );
      if (updated.count !== 1) {
        throw conflict(
          'As configurações foram alteradas por outra sessão. Recarregue a tela e tente novamente.',
        );
      }

      const after = await this.repository.findSettings(transaction);
      if (!after) throw notFound('Configurações da plataforma não encontradas.');

      await this.repository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          action: 'UPDATE_PLATFORM_SETTINGS',
          resource: 'PlatformSettings:1',
          metadata: buildAuditMetadata({ before, after }),
        },
        transaction,
      );

      return presentPlatformSettings(after);
    });

    this.maintenanceState.invalidate();
    return result;
  }
}

export default new UpdatePlatformSettingsService();
