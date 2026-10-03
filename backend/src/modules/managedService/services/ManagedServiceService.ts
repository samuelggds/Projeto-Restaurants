import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  hasContinuousManagementAccess,
  hasImplementationAccess,
} from '../domain/managedServicePolicy.js';
import {
  implementationUpdateSchema,
  managedRequestCreateSchema,
  managedRequestUpdateSchema,
} from '../domain/managedServiceSchemas.js';

type AdminActor = {
  userId: number;
  restaurantId: number;
  userName?: string | null;
  userRole?: string | null;
};

type SuperAdminActor = {
  userId: number;
  userName?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
};

function assertPositiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  return id;
}

function serializeImplementation(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    status: row.status,
    productLimit: row.productLimit,
    notes: row.notes,
    startedAt: row.startedAt?.toISOString?.() ?? row.startedAt ?? null,
    completedAt: row.completedAt?.toISOString?.() ?? row.completedAt ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}

function serializeRequest(row: any) {
  return {
    id: row.id,
    restaurantId: row.restaurantId,
    requestedByUserId: row.requestedByUserId,
    handledByUserId: row.handledByUserId,
    category: row.category,
    title: row.title,
    description: row.description,
    status: row.status,
    response: row.response,
    completedAt: row.completedAt?.toISOString?.() ?? row.completedAt ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    ...(row.requestedBy ? { requestedBy: row.requestedBy } : {}),
    ...(row.handledBy ? { handledBy: row.handledBy } : {}),
    ...(row.restaurant ? { restaurant: row.restaurant } : {}),
  };
}

async function subscriptionForRestaurant(db: Prisma.TransactionClient | typeof prisma, restaurantId: number) {
  return db.subscription.findUnique({
    where: { restaurantId },
    select: { plan: true, status: true },
  });
}

export class ManagedServiceService {
  async getAdminOverview(actor: AdminActor) {
    const restaurantId = assertPositiveId(actor.restaurantId, 'Restaurante');
    return withTenantDbContext(restaurantId, async (db) => {
      const subscription = await subscriptionForRestaurant(db, restaurantId);
      const implementation = hasImplementationAccess(subscription?.plan, subscription?.status)
        ? await db.restaurantImplementation.upsert({
            where: { restaurantId },
            create: { restaurantId, status: 'AGUARDANDO_MATERIAL', productLimit: 150 },
            update: {},
          })
        : await db.restaurantImplementation.findUnique({ where: { restaurantId } });
      const requests = await db.restaurantManagedUpdateRequest.findMany({
        where: { restaurantId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
      });

      return {
        plan: subscription?.plan ?? null,
        subscriptionStatus: subscription?.status ?? null,
        implementationEligible: hasImplementationAccess(subscription?.plan, subscription?.status),
        continuousManagementEnabled: hasContinuousManagementAccess(
          subscription?.plan,
          subscription?.status,
        ),
        implementation: serializeImplementation(implementation),
        requests: requests.map(serializeRequest),
      };
    });
  }

  async createAdminRequest(input: unknown, actor: AdminActor) {
    const restaurantId = assertPositiveId(actor.restaurantId, 'Restaurante');
    const userId = assertPositiveId(actor.userId, 'Usuário');
    const parsed = managedRequestCreateSchema.parse(input);

    return withTenantDbContext(restaurantId, async (db) => {
      const subscription = await subscriptionForRestaurant(db, restaurantId);
      if (!hasContinuousManagementAccess(subscription?.plan, subscription?.status)) {
        throw new Error(
          'Solicitações contínuas de atualização estão disponíveis somente no plano Gestão Total ativo.',
        );
      }

      const requester = await db.user.findFirst({
        where: { id: userId, restaurantId, role: 'ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!requester) throw new Error('Administrador não autorizado para este restaurante.');

      const request = await db.restaurantManagedUpdateRequest.create({
        data: {
          restaurantId,
          requestedByUserId: requester.id,
          category: parsed.category,
          title: parsed.title,
          description: parsed.description,
        },
      });

      await db.auditLog.create({
        data: {
          restaurantId,
          userId: requester.id,
          userName: requester.name,
          userRole: requester.role,
          action: 'MANAGED_UPDATE_REQUEST_CREATED',
          resource: `RestaurantManagedUpdateRequest:${request.id}`,
          metadata: {
            category: request.category,
            title: request.title,
            status: request.status,
          },
        },
      });

      return serializeRequest(request);
    });
  }

  async listSuperAdminQueue() {
    const eligibleSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: { in: ['PREMIUM', 'GESTAO_TOTAL'] },
        status: { in: ['ATIVA', 'TESTE'] },
      },
      select: { restaurantId: true },
    });
    if (eligibleSubscriptions.length) {
      await prisma.restaurantImplementation.createMany({
        data: eligibleSubscriptions.map(({ restaurantId }) => ({
          restaurantId,
          status: 'AGUARDANDO_MATERIAL',
          productLimit: 150,
        })),
        skipDuplicates: true,
      });
    }

    const [implementations, requests] = await Promise.all([
      prisma.restaurantImplementation.findMany({
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              slug: true,
              _count: { select: { products: true, categories: true } },
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
      }),
      prisma.restaurantManagedUpdateRequest.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 300,
        include: {
          restaurant: { select: { id: true, name: true, slug: true } },
          requestedBy: { select: { id: true, name: true } },
          handledBy: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      implementations: implementations.map((item) => ({
        ...serializeImplementation(item),
        restaurant: {
          id: item.restaurant.id,
          name: item.restaurant.name,
          slug: item.restaurant.slug,
          plan: item.restaurant.subscription?.plan ?? null,
          subscriptionStatus: item.restaurant.subscription?.status ?? null,
          productsCount: item.restaurant._count.products,
          categoriesCount: item.restaurant._count.categories,
        },
      })),
      requests: requests.map(serializeRequest),
    };
  }

  async updateImplementation(restaurantIdValue: unknown, input: unknown, actor: SuperAdminActor) {
    const restaurantId = assertPositiveId(restaurantIdValue, 'Restaurante');
    const actorUserId = assertPositiveId(actor.userId, 'SUPER_ADMIN');
    const parsed = implementationUpdateSchema.parse(input);

    return prisma.$transaction(async (db) => {
      const superAdmin = await db.user.findFirst({
        where: { id: actorUserId, role: 'SUPER_ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!superAdmin) throw new Error('SUPER_ADMIN não autorizado.');

      const restaurant = await db.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          id: true,
          name: true,
          subscription: { select: { plan: true, status: true } },
        },
      });
      if (!restaurant) throw new Error('Restaurante não encontrado.');
      if (!hasImplementationAccess(restaurant.subscription?.plan, restaurant.subscription?.status)) {
        throw new Error('Este restaurante não possui implantação assistida ativa.');
      }

      const before = await db.restaurantImplementation.findUnique({ where: { restaurantId } });
      const now = new Date();
      const after = await db.restaurantImplementation.upsert({
        where: { restaurantId },
        create: {
          restaurantId,
          status: parsed.status,
          notes: parsed.notes ?? null,
          startedAt: parsed.status === 'EM_IMPLANTACAO' ? now : null,
          completedAt: parsed.status === 'CONCLUIDA' ? now : null,
        },
        update: {
          status: parsed.status,
          notes: parsed.notes,
          ...(parsed.status === 'EM_IMPLANTACAO' && !before?.startedAt ? { startedAt: now } : {}),
          completedAt: parsed.status === 'CONCLUIDA' ? now : null,
        },
      });

      await db.auditLog.create({
        data: {
          userId: superAdmin.id,
          userName: superAdmin.name,
          userRole: superAdmin.role,
          restaurantId,
          restaurantName: restaurant.name,
          action: 'UPDATE_RESTAURANT_IMPLEMENTATION',
          resource: `RestaurantImplementation:${after.id}`,
          ipAddress: actor.ipAddress ?? null,
          requestId: actor.requestId ?? null,
          userAgent: actor.userAgent ?? null,
          metadata: {
            before: before
              ? { status: before.status, notes: before.notes, completedAt: before.completedAt }
              : null,
            after: { status: after.status, notes: after.notes, completedAt: after.completedAt },
          },
        },
      });

      return serializeImplementation(after);
    });
  }

  async updateManagedRequest(requestIdValue: unknown, input: unknown, actor: SuperAdminActor) {
    const requestId = String(requestIdValue || '').trim();
    if (!requestId) throw new Error('Solicitação inválida.');
    const actorUserId = assertPositiveId(actor.userId, 'SUPER_ADMIN');
    const parsed = managedRequestUpdateSchema.parse(input);

    return prisma.$transaction(async (db) => {
      const superAdmin = await db.user.findFirst({
        where: { id: actorUserId, role: 'SUPER_ADMIN', active: true },
        select: { id: true, name: true, role: true },
      });
      if (!superAdmin) throw new Error('SUPER_ADMIN não autorizado.');

      const before = await db.restaurantManagedUpdateRequest.findUnique({
        where: { id: requestId },
        include: { restaurant: { select: { id: true, name: true } } },
      });
      if (!before) throw new Error('Solicitação não encontrada.');

      const after = await db.restaurantManagedUpdateRequest.update({
        where: { id: requestId },
        data: {
          status: parsed.status,
          response: parsed.response,
          handledByUserId:
            parsed.status === 'ABERTA' ? before.handledByUserId : superAdmin.id,
          completedAt: parsed.status === 'CONCLUIDA' ? new Date() : null,
        },
        include: {
          restaurant: { select: { id: true, name: true, slug: true } },
          requestedBy: { select: { id: true, name: true } },
          handledBy: { select: { id: true, name: true } },
        },
      });

      await db.auditLog.create({
        data: {
          userId: superAdmin.id,
          userName: superAdmin.name,
          userRole: superAdmin.role,
          restaurantId: before.restaurantId,
          restaurantName: before.restaurant.name,
          action: 'UPDATE_MANAGED_SERVICE_REQUEST',
          resource: `RestaurantManagedUpdateRequest:${before.id}`,
          ipAddress: actor.ipAddress ?? null,
          requestId: actor.requestId ?? null,
          userAgent: actor.userAgent ?? null,
          metadata: {
            before: { status: before.status, response: before.response },
            after: { status: after.status, response: after.response },
          },
        },
      });

      return serializeRequest(after);
    });
  }
}

export default new ManagedServiceService();
