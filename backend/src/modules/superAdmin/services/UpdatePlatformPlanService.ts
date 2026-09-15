import { Prisma, type PlanType } from '@prisma/client';
import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { notFound, conflict, SuperAdminError } from '../domain/superAdminErrors.js';
import {
  platformPlanUpdateSchema,
  type PlatformPlanUpdateInput,
} from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { presentPlatformPlan } from './superAdminPresenters.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';

function parsePlanCode(value: unknown): PlanType {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized !== 'BASICO' && normalized !== 'PREMIUM') {
    throw new SuperAdminError('Plano inválido.', 400, 'INVALID_PLAN');
  }
  return normalized;
}

export class UpdatePlatformPlanService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(code: unknown, payload: unknown, context: AuditContext) {
    const planCode = parsePlanCode(code);
    const parsed = parseSuperAdminPayload<PlatformPlanUpdateInput>(platformPlanUpdateSchema, payload);
    const { version, useDefaultTrialDays, ...changes } = parsed;

    return this.repository.transaction(async (transaction) => {
      const actor = await requireSuperAdminActor(this.repository, context, transaction);
      const before = await this.repository.findPlan(planCode, transaction);
      if (!before) throw notFound('Plano não encontrado.');

      const updated = await this.repository.updatePlanIfVersion(
        planCode,
        version,
        {
          ...changes,
          version: { increment: 1 },
          updatedByUserId: actor.id,
        },
        transaction,
      );
      if (updated.count !== 1) {
        throw conflict('O plano foi alterado por outra sessão. Recarregue e tente novamente.');
      }

      if (useDefaultTrialDays !== undefined) {
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "PlatformPlanPolicy" ("code", "useDefaultTrialDays", "updatedAt")
          VALUES (${planCode}::"PlanType", ${useDefaultTrialDays}, CURRENT_TIMESTAMP)
          ON CONFLICT ("code") DO UPDATE SET
            "useDefaultTrialDays" = EXCLUDED."useDefaultTrialDays",
            "updatedAt" = CURRENT_TIMESTAMP
        `);
      }

      const after = await this.repository.findPlan(planCode, transaction);
      if (!after) throw notFound('Plano não encontrado.');
      const restaurantsCount = await this.repository.countSubscriptionsForPlan(
        planCode,
        transaction,
      );

      await this.repository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          action: 'UPDATE_PLATFORM_PLAN',
          resource: `PlatformPlan:${planCode}`,
          metadata: buildAuditMetadata({
            before,
            after:
              useDefaultTrialDays === undefined
                ? after
                : { ...after, useDefaultTrialDays },
          }),
        },
        transaction,
      );

      return {
        ...presentPlatformPlan(after, restaurantsCount),
        ...(useDefaultTrialDays !== undefined ? { useDefaultTrialDays } : {}),
      };
    });
  }
}

export default new UpdatePlatformPlanService();
