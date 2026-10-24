import { temporaryBillingAccessExpiresAt } from '../../billing/utils/temporaryBillingAccess.js';
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

      // A liberação manual não pode contornar faturas que continuam bloqueantes:
      // o avaliador de cobrança reverteria a alteração na primeira requisição.
      if (parsed.active) {
        const { hasBlockingInvoices } = await import('../../billing/utils/billingRules.js');
        const openInvoices = await transaction.invoice.findMany({
          where: { restaurantId, status: { in: ['PENDENTE', 'ATRASADO'] } },
          select: { status: true, dueDate: true },
        });
        if (!parsed.temporaryAccessDays && hasBlockingInvoices(openInvoices, new Date())) {
          throw new SuperAdminError(
            'Este restaurante possui fatura vencida além da tolerância. A liberação depende da regularização da cobrança; alterar apenas o acesso não remove o bloqueio financeiro.',
            409,
            'BILLING_REGULARIZATION_REQUIRED',
          );
        }
      }

      if (parsed.temporaryAccessDays) {
        const subscription = await transaction.subscription.findUnique({ where: { restaurantId }, select: { status: true } });
        if (!subscription || subscription.status === 'CANCELADA') {
          throw new SuperAdminError('Assinatura cancelada ou inexistente. Não é possível autorizar acesso temporário.', 409, 'SUBSCRIPTION_NOT_ELIGIBLE');
        }
      }

      const after = await this.repository.updateRestaurantAccess(
        restaurantId,
        parsed.active,
        transaction,
      );
      const temporaryUntil = parsed.temporaryAccessDays
        ? temporaryBillingAccessExpiresAt(new Date(), parsed.temporaryAccessDays)
        : null;
      await transaction.restaurant.update({
        where: { id: restaurantId },
        data: { billingTemporaryAccessUntil: temporaryUntil },
      });
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
          action: parsed.temporaryAccessDays ? 'TEMPORARY_BILLING_ACCESS_GRANTED' : parsed.active ? 'UNBLOCK_RESTAURANT_ACCESS' : 'BLOCK_RESTAURANT_ACCESS',
          resource: `Restaurant:${restaurantId}`,
          metadata: buildAuditMetadata({
            reason: parsed.reason,
            before,
            after: { ...after, billingTemporaryAccessUntil: temporaryUntil },
          }),
        },
        transaction,
      );

      return {
        id: after.id,
        name: after.name,
        active: after.active,
        billingTemporaryAccessUntil: temporaryUntil?.toISOString() ?? null,
        accessBlockReason: after.accessBlockReason,
        updatedAt: after.updatedAt.toISOString(),
      };
    });
  }
}

export default new UpdateRestaurantAccessService();
