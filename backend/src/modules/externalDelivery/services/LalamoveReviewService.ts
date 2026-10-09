import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  assertLalamoveReviewTransition,
  lalamoveReviewStatusSchema,
  lalamoveReviewUpdateSchema,
  LALAMOVE_PROVIDER,
} from '../domain/lalamoveReviewSchema.js';

const PAGE_SIZE = 40;

type ReviewDependencies = {
  database: typeof prisma;
  tenant: typeof withTenantDbContext;
};

export class LalamoveReviewError extends Error {
  // Match the shared error handler without weakening its safe 5xx responses.
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'LalamoveReviewError';
  }
}

function safeInteger(value: unknown, label: string): number {
  // Reject coercible objects, arrays, booleans and ambiguous query encodings.
  if (
    typeof value !== 'number' &&
    (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))
  ) {
    throw new LalamoveReviewError(label + ' inválido.', 400);
  }
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) {
    throw new LalamoveReviewError(label + ' inválido.', 400);
  }
  return id;
}

function asReviewRow(input: {
  id: string;
  restaurantId: number;
  status: string;
  reviewReasonCode: string | null;
  reviewedAt: Date | null;
  requestedAt: Date;
  updatedAt: Date;
  requestedByUserId: number;
}) {
  const status = lalamoveReviewStatusSchema.safeParse(input.status);
  if (!status.success) {
    throw new LalamoveReviewError('Estado de solicitação não reconhecido.', 409);
  }
  return {
    id: input.id,
    restaurantId: input.restaurantId,
    status: status.data,
    reviewReasonCode: input.reviewReasonCode,
    reviewedAt: input.reviewedAt?.toISOString() ?? null,
    requestedAt: input.requestedAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
    requestedByUserId: input.requestedByUserId,
    // A review NEVER indicates a provider connection.
    connected: false,
    canDispatch: false,
  };
}

const reviewSelect = {
  id: true,
  restaurantId: true,
  status: true,
  reviewReasonCode: true,
  reviewedAt: true,
  requestedAt: true,
  updatedAt: true,
  requestedByUserId: true,
} as const satisfies Prisma.RestaurantExternalDeliveryOnboardingSelect;

export class LalamoveReviewService {
  constructor(
    private readonly deps: ReviewDependencies = {
      database: prisma,
      tenant: withTenantDbContext,
    },
  ) {}

  private async superAdmin(idValue: unknown) {
    const id = safeInteger(idValue, 'SUPER_ADMIN');
    const user = await this.deps.database.user.findFirst({
      where: { id, role: 'SUPER_ADMIN', active: true, restaurantId: null },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new LalamoveReviewError('Acesso exclusivo do SUPER_ADMIN.', 403);
    return user;
  }

  async listRequests(actorId: unknown, cursorValue?: unknown) {
    await this.superAdmin(actorId);
    const cursor = cursorValue == null ? null : safeInteger(cursorValue, 'Cursor');
    // Restaurant is a platform table. Protected onboarding records MUST be read
    // inside the respective tenant RLS transaction, never in a global query.
    const restaurants = await this.deps.database.restaurant.findMany({
      where: cursor ? { id: { lt: cursor } } : {},
      orderBy: { id: 'desc' },
      take: PAGE_SIZE + 1,
      select: { id: true, name: true, slug: true },
    });
    const scanned = restaurants.slice(0, PAGE_SIZE);
    const entries = [];
    // Bounded batches prevent exhausting the connection pool when SaaS grows.
    for (let index = 0; index < scanned.length; index += 5) {
      const batch = await Promise.all(
        scanned.slice(index, index + 5).map(async (restaurant) =>
          this.deps.tenant(restaurant.id, async (db) => {
            const row = await db.restaurantExternalDeliveryOnboarding.findUnique({
              where: {
                restaurantId_provider: {
                  restaurantId: restaurant.id,
                  provider: LALAMOVE_PROVIDER,
                },
              },
              select: reviewSelect,
            });
            return row ? { ...asReviewRow(row), restaurant: restaurant } : null;
          }),
        ),
      );
      entries.push(...batch.filter((item): item is NonNullable<typeof item> => item !== null));
    }
    return {
      requests: entries,
      nextCursor:
        restaurants.length > PAGE_SIZE && scanned.length > 0
          ? scanned[scanned.length - 1].id
          : null,
    };
  }

  async updateRequest(
    actorId: unknown,
    restaurantValue: unknown,
    payload: unknown,
    context: {
      ipAddress: string | null;
      requestId: string | null;
      userAgent: string | null;
    },
  ) {
    const actor = await this.superAdmin(actorId);
    const restaurantId = safeInteger(restaurantValue, 'Restaurante');
    const parsed = lalamoveReviewUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LalamoveReviewError(
        parsed.error.issues[0]?.message || 'Dados inválidos.',
        400,
      );
    }
    const change = parsed.data;
    try {
      assertLalamoveReviewTransition(change.expectedStatus, change.status);
    } catch {
      throw new LalamoveReviewError('Transição de status não permitida.', 400);
    }

    return this.deps.tenant(restaurantId, async (db) => {
      const previous = await db.restaurantExternalDeliveryOnboarding.findUnique({
        where: {
          restaurantId_provider: { restaurantId, provider: LALAMOVE_PROVIDER },
        },
        select: reviewSelect,
      });
      if (!previous) {
        throw new LalamoveReviewError('Solicitação não encontrada para este restaurante.', 404);
      }
      if (
        previous.status !== change.expectedStatus ||
        previous.updatedAt.toISOString() !== new Date(change.expectedUpdatedAt).toISOString()
      ) {
        throw new LalamoveReviewError(
          'Esta solicitação foi atualizada por outra pessoa. Recarregue a lista.',
          409,
        );
      }
      // Double checked in an atomic UPDATE: two reviewers cannot overwrite
      // each other's decisions. The review does not create or enable credentials.
      const updated = await db.restaurantExternalDeliveryOnboarding.updateMany({
        where: {
          id: previous.id,
          restaurantId,
          provider: LALAMOVE_PROVIDER,
          status: change.expectedStatus,
          updatedAt: previous.updatedAt,
        },
        data: {
          status: change.status,
          reviewReasonCode: change.status === 'IN_REVIEW' ? null : change.reasonCode,
          reviewedAt: new Date(),
          reviewedByUserId: actor.id,
        },
      });
      if (updated.count !== 1) {
        throw new LalamoveReviewError(
          'Revisão concorrente detectada. Recarregue os dados antes de tentar novamente.',
          409,
        );
      }

      const restaurant = await db.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true },
      });
      if (!restaurant) throw new LalamoveReviewError('Restaurante não encontrado.', 404);
      const after = await db.restaurantExternalDeliveryOnboarding.findUniqueOrThrow({
        where: {
          restaurantId_provider: { restaurantId, provider: LALAMOVE_PROVIDER },
        },
        select: reviewSelect,
      });
      await db.auditLog.create({
        data: {
          userId: actor.id,
          userName: actor.name,
          userRole: actor.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: 'LALAMOVE_ONBOARDING_REVIEWED',
          resource: 'RestaurantExternalDeliveryOnboarding:' + after.id,
          ipAddress: context.ipAddress,
          requestId: context.requestId,
          userAgent: context.userAgent,
          metadata: {
            provider: LALAMOVE_PROVIDER,
            oldStatus: previous.status,
            newStatus: after.status,
            reasonCode: after.reviewReasonCode,
            connected: false,
          },
        },
      });
      return asReviewRow(after);
    });
  }
}

export default new LalamoveReviewService();
