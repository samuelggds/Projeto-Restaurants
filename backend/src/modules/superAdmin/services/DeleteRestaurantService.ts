import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { notFound, SuperAdminError } from '../domain/superAdminErrors.js';
import type { AuditContext } from '../repositories/SuperAdminRepository.js';
import superAdminRepository from '../repositories/SuperAdminRepository.js';

const deleteRestaurantSchema = z
  .object({
    reason: z.string().trim().min(8, 'Motivo deve ter no mínimo 8 caracteres.').max(500),
  })
  .strict();

function parseRestaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new SuperAdminError('Restaurante inválido.', 400, 'INVALID_RESTAURANT');
  }
  return id;
}

export class DeleteRestaurantService {
  async execute(restaurantIdValue: unknown, payload: unknown, context: AuditContext) {
    const restaurantId = parseRestaurantId(restaurantIdValue);
    const parsed = deleteRestaurantSchema.parse(payload);

    return prisma.$transaction(async (transaction) => {
      const actor = await superAdminRepository.findActor(context.actorUserId, transaction);
      if (!actor) {
        throw new SuperAdminError('Acesso permitido apenas para SUPER_ADMIN.', 403, 'FORBIDDEN');
      }

      const restaurant = await transaction.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { orders: true, invoices: true } },
        },
      });

      if (!restaurant) throw notFound('Restaurante não encontrado.');

      if (restaurant._count.orders > 0 || restaurant._count.invoices > 0) {
        throw new SuperAdminError(
          'Este restaurante possui pedidos ou faturas e não pode ser excluído permanentemente. Bloqueie o acesso para preservar o histórico operacional e financeiro.',
          409,
          'RESTAURANT_HAS_HISTORY',
        );
      }

      await transaction.auditLog.create({
        data: {
          userId: context.actorUserId,
          userName: actor.name,
          userRole: String(actor.role),
          restaurantId,
          restaurantName: restaurant.name,
          action: 'DELETE_RESTAURANT',
          resource: `Restaurant:${restaurantId}`,
          ipAddress: context.ipAddress,
          requestId: context.requestId,
          userAgent: context.userAgent,
          metadata: {
            reason: parsed.reason,
            slug: restaurant.slug,
            permanent: true,
          },
          result: 'SUCCESS',
        },
      });

      try {
        await transaction.restaurant.delete({ where: { id: restaurantId } });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
          throw new SuperAdminError(
            'Este restaurante possui registros vinculados que precisam ser preservados e não pode ser excluído permanentemente. Bloqueie o acesso em vez de excluir.',
            409,
            'RESTAURANT_HAS_LINKED_RECORDS',
          );
        }
        throw error;
      }

      return { id: restaurant.id, name: restaurant.name, deleted: true };
    });
  }
}

export default new DeleteRestaurantService();
