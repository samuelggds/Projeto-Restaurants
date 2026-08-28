import type { PlanType, Prisma } from '@prisma/client';
import { buildAuditMetadata } from '../domain/auditMetadata.js';
import { notFound, SuperAdminError } from '../domain/superAdminErrors.js';
import {
  restaurantSubscriptionUpdateSchema,
  type RestaurantSubscriptionUpdateInput,
} from '../domain/superAdminSchemas.js';
import superAdminRepository, {
  type AuditContext,
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import { presentSubscription } from './superAdminPresenters.js';
import { parseSuperAdminPayload, requireSuperAdminActor } from './superAdminServiceSupport.js';

function parseRestaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
  }
  return id;
}

export class UpdateRestaurantSubscriptionService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(restaurantIdValue: unknown, payload: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const parsed = parseSuperAdminPayload<RestaurantSubscriptionUpdateInput>(
      restaurantSubscriptionUpdateSchema,
      payload,
    );

    return this.repository.transaction(async (transaction) => {
      const actor = await requireSuperAdminActor(this.repository, context, transaction);
      const restaurant = await this.repository.findRestaurantForMutation(restaurantId, transaction);
      if (!restaurant) throw notFound('Restaurante não encontrado.');

      const before = await this.repository.findSubscription(restaurantId, transaction);
      if (!before) throw notFound('Assinatura do restaurante não encontrada.');

      if (parsed.planCode) {
        const selectedPlan = await this.repository.findPlan(parsed.planCode as PlanType, transaction);
        if (!selectedPlan || !selectedPlan.active) {
          throw new SuperAdminError(
            'O plano selecionado não está disponível para novas alterações.',
            400,
            'PLAN_UNAVAILABLE',
          );
        }
      }

      const data: Prisma.SubscriptionUpdateInput = {
        ...(parsed.planCode ? { plan: parsed.planCode } : {}),
        ...(parsed.status ? { status: parsed.status } : {}),
        ...(parsed.trialEndsAt !== undefined
          ? { trialEndsAt: parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : null }
          : {}),
        ...(parsed.nextBillingAt !== undefined
          ? { currentPeriodEnd: parsed.nextBillingAt ? new Date(parsed.nextBillingAt) : null }
          : {}),
      };
      const after = await this.repository.updateSubscription(restaurantId, data, transaction);

      await this.repository.createAuditLog(
        {
          ...context,
          actorName: actor.name,
          actorRole: actor.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: 'UPDATE_RESTAURANT_SUBSCRIPTION',
          resource: `Subscription:${before.id}`,
          metadata: buildAuditMetadata({
            reason: parsed.reason,
            before,
            after,
          }),
        },
        transaction,
      );

      return presentSubscription(after);
    });
  }
}

export default new UpdateRestaurantSubscriptionService();

