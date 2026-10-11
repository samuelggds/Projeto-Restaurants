import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { hasManagedWorkspaceAccess } from '../domain/managedServicePolicy.js';
import { MANAGED_IMAGE_MODEL, ManagedImageError, type ManagedImageActor, type ManagedImagePurpose } from '../domain/managedImageEnhancement.js';

export type ManagedImageAttempt = {
  restaurantId: number;
  restaurantName: string;
  actor: ManagedImageActor;
  purpose: ManagedImagePurpose;
  operationId: string;
  inputDigest: string;
};

export const managedImageEnhancementStore = {
  async authorize(restaurantId: number, actor: ManagedImageActor) {
    if (actor.userRole !== 'SUPER_ADMIN' || !Number.isSafeInteger(actor.userId) || actor.userId <= 0) {
      throw new ManagedImageError(403, 'MANAGED_IMAGE_FORBIDDEN', 'SUPER_ADMIN não autorizado.');
    }
    const user = await prisma.user.findFirst({
      where: { id: actor.userId, role: 'SUPER_ADMIN', active: true },
      select: { id: true },
    });
    if (!user) throw new ManagedImageError(403, 'MANAGED_IMAGE_FORBIDDEN', 'SUPER_ADMIN não autorizado.');
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, name: true, subscription: { select: { plan: true, status: true } }, implementation: { select: { status: true } } },
    });
    if (!restaurant) throw new ManagedImageError(404, 'MANAGED_IMAGE_NOT_FOUND', 'Restaurante não encontrado.');
    if (!hasManagedWorkspaceAccess(restaurant.subscription?.plan, restaurant.subscription?.status, restaurant.implementation?.status)) {
      throw new ManagedImageError(403, 'MANAGED_IMAGE_WORKSPACE_CLOSED', 'Este restaurante não possui workspace assistido disponível.');
    }
    return { id: restaurant.id, name: restaurant.name };
  },

  async begin(attempt: ManagedImageAttempt) {
    await withTenantDbContext(attempt.restaurantId, async (db) => {
      // Serializes the check/insert across replicas; never held during the provider call.
      // Project a supported scalar: Prisma cannot deserialize the lock's void return type.
      await db.$queryRaw<Array<{ lockAcquired: number }>>`
        SELECT 1::int AS "lockAcquired"
        FROM pg_advisory_xact_lock(7622, ${attempt.restaurantId}::int)
      `;
      const prior = await db.auditLog.findFirst({
        where: { restaurantId: attempt.restaurantId, userId: attempt.actor.userId, requestId: attempt.operationId, action: 'MANAGED_IMAGE_AI_REQUESTED' },
        select: { id: true },
      });
      if (prior) {
        throw new ManagedImageError(409, 'MANAGED_IMAGE_ALREADY_REQUESTED', 'Esta melhoria já foi solicitada. A chamada não será repetida para evitar consumo duplicado.');
      }
      await db.auditLog.create({ data: {
        restaurantId: attempt.restaurantId,
        restaurantName: attempt.restaurantName,
        userId: attempt.actor.userId,
        userRole: 'SUPER_ADMIN',
        requestId: attempt.operationId,
        action: 'MANAGED_IMAGE_AI_REQUESTED',
        resource: 'ManagedRestaurantImage',
        metadata: { payer: 'PLATFORM', purpose: attempt.purpose, model: MANAGED_IMAGE_MODEL, inputDigest: attempt.inputDigest, billingState: 'PENDING' },
      } });
    });
  },

  async record(attempt: ManagedImageAttempt, action: 'MANAGED_IMAGE_AI_PROCESSED' | 'MANAGED_IMAGE_AI_FAILED', metadata: Prisma.InputJsonObject) {
    await withTenantDbContext(attempt.restaurantId, (db) => db.auditLog.create({ data: {
      restaurantId: attempt.restaurantId,
      restaurantName: attempt.restaurantName,
      userId: attempt.actor.userId,
      userRole: 'SUPER_ADMIN',
      requestId: attempt.operationId,
      action,
      resource: 'ManagedRestaurantImage',
      metadata: { ...metadata, payer: 'PLATFORM', purpose: attempt.purpose, model: MANAGED_IMAGE_MODEL },
    } }));
  },
};
