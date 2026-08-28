import type { PlanType, Prisma, SubscriptionStatus, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import supportConversationRepository, {
  type LatestSupportConversationRow,
} from '../../aiSupport/repositories/SupportConversationRepository.js';

export type SuperAdminDatabaseClient = Prisma.TransactionClient | typeof prisma;

export type AuditContext = {
  actorUserId: number;
  ipAddress: string | null;
  requestId: string | null;
  userAgent: string | null;
};

export type LatestSupportTicketRow = LatestSupportConversationRow;

const safeAdministratorSelect = {
  id: true,
  name: true,
  email: true,
  active: true,
  mfaEnabled: true,
  mustChangePassword: true,
  lastLoginAt: true,
  createdAt: true,
  restaurantId: true,
} satisfies Prisma.UserSelect;

const safeSubscriptionSelect = {
  id: true,
  restaurantId: true,
  plan: true,
  status: true,
  trialEndsAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  balanceDebt: true,
  scheduledPlan: true,
  scheduledPlanEffectiveMonth: true,
  scheduledPlanEffectiveYear: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SubscriptionSelect;

export class SuperAdminRepository {
  transaction<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(operation);
  }

  async loadDashboardSnapshot(now = new Date()) {
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const historyStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      restaurants,
      plans,
      invoices,
      administrators,
      supportTickets,
      auditLogs,
      settings,
      monthlyOrdersByRestaurant,
      generatedInvoicesAggregate,
      openInvoicesAggregate,
      openInvoicesCount,
      monthlyPaidInvoices,
    ] = await Promise.all([
      prisma.restaurant.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          active: true,
          createdAt: true,
          subscription: { select: safeSubscriptionSelect },
          users: {
            where: { role: 'ADMIN' },
            orderBy: { createdAt: 'asc' },
            select: safeAdministratorSelect,
          },
          invoices: {
            where: { status: 'ATRASADO' },
            select: { id: true },
            take: 1,
          },
        },
      }),
      prisma.platformPlan.findMany({ orderBy: { monthlyFee: 'asc' } }),
      prisma.invoice.findMany({
        orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
        take: 200,
        select: {
          id: true,
          restaurantId: true,
          month: true,
          year: true,
          monthlyFee: true,
          systemFees: true,
          total: true,
          status: true,
          dueDate: true,
          paidAt: true,
          paymentLink: true,
          restaurant: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'desc' },
        select: {
          ...safeAdministratorSelect,
          restaurant: { select: { name: true } },
        },
      }),
      this.listLatestSupportTickets(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          createdAt: true,
          userName: true,
          userRole: true,
          restaurantName: true,
          action: true,
          resource: true,
          ipAddress: true,
          requestId: true,
          userAgent: true,
          metadata: true,
          result: true,
        },
      }),
      prisma.platformSettings.findUnique({ where: { id: 1 } }),
      prisma.order.groupBy({
        by: ['restaurantId'],
        where: {
          paid: true,
          status: { not: 'CANCELADO' },
          createdAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { not: 'CANCELADO' } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
        _sum: { total: true },
      }),
      prisma.invoice.count({ where: { status: { in: ['PENDENTE', 'ATRASADO'] } } }),
      prisma.invoice.findMany({
        where: { status: 'PAGO', paidAt: { gte: historyStart } },
        select: { total: true, paidAt: true },
      }),
    ]);

    return {
      restaurants,
      plans,
      invoices,
      administrators,
      supportTickets,
      auditLogs,
      settings,
      monthlyOrdersByRestaurant,
      generatedInvoicesAggregate,
      openInvoicesAggregate,
      openInvoicesCount,
      monthlyPaidInvoices,
    };
  }

  listLatestSupportTickets() {
    return supportConversationRepository.listLatest();
  }

  async getRestaurantDetails(id: number) {
    const [restaurant, orderStatistics] = await Promise.all([
      prisma.restaurant.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          whatsapp: true,
          cnpj: true,
          logo: true,
          coverImage: true,
          description: true,
          address: true,
          addressNumber: true,
          addressComplement: true,
          addressDistrict: true,
          city: true,
          state: true,
          zipCode: true,
          openingHours: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          subscription: { select: safeSubscriptionSelect },
          users: {
            where: { role: 'ADMIN' },
            orderBy: { createdAt: 'asc' },
            select: safeAdministratorSelect,
          },
          invoices: {
            orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
            take: 100,
            select: {
              id: true,
              month: true,
              year: true,
              monthlyFee: true,
              systemFees: true,
              total: true,
              status: true,
              dueDate: true,
              paidAt: true,
            },
          },
          supportChatMessages: {
            orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
            take: 100,
            select: {
              id: true,
              message: true,
              senderRole: true,
              senderUserId: true,
              senderLabel: true,
              sentAt: true,
            },
          },
          _count: {
            select: { orders: true, products: true, users: true, tables: true },
          },
        },
      }),
      prisma.order.aggregate({
        where: { restaurantId: id, paid: true, status: { not: 'CANCELADO' } },
        _count: { id: true },
        _sum: { total: true, systemFee: true },
      }),
    ]);

    return { restaurant, orderStatistics };
  }

  findActor(userId: number, db: SuperAdminDatabaseClient = prisma) {
    return db.user.findFirst({
      where: { id: userId, role: 'SUPER_ADMIN', active: true },
      select: { id: true, name: true, role: true },
    });
  }

  findSettings(db: SuperAdminDatabaseClient = prisma) {
    return db.platformSettings.findUnique({ where: { id: 1 } });
  }

  updateSettingsIfVersion(
    version: number,
    data: Prisma.PlatformSettingsUpdateManyMutationInput,
    db: SuperAdminDatabaseClient = prisma,
  ) {
    return db.platformSettings.updateMany({ where: { id: 1, version }, data });
  }

  findPlan(code: PlanType, db: SuperAdminDatabaseClient = prisma) {
    return db.platformPlan.findUnique({ where: { code } });
  }

  countSubscriptionsForPlan(code: PlanType, db: SuperAdminDatabaseClient = prisma) {
    return db.subscription.count({ where: { plan: code } });
  }

  updatePlanIfVersion(
    code: PlanType,
    version: number,
    data: Prisma.PlatformPlanUpdateManyMutationInput,
    db: SuperAdminDatabaseClient = prisma,
  ) {
    return db.platformPlan.updateMany({ where: { code, version }, data });
  }

  findRestaurantForMutation(id: number, db: SuperAdminDatabaseClient = prisma) {
    return db.restaurant.findUnique({
      where: { id },
      select: { id: true, name: true, active: true },
    });
  }

  updateRestaurantAccess(id: number, active: boolean, db: SuperAdminDatabaseClient = prisma) {
    return db.restaurant.update({
      where: { id },
      data: { active },
      select: { id: true, name: true, active: true, updatedAt: true },
    });
  }

  findSubscription(restaurantId: number, db: SuperAdminDatabaseClient = prisma) {
    return db.subscription.findUnique({
      where: { restaurantId },
      select: safeSubscriptionSelect,
    });
  }

  updateSubscription(
    restaurantId: number,
    data: Prisma.SubscriptionUpdateInput,
    db: SuperAdminDatabaseClient = prisma,
  ) {
    return db.subscription.update({
      where: { restaurantId },
      data,
      select: safeSubscriptionSelect,
    });
  }

  findAdministrator(id: number, db: SuperAdminDatabaseClient = prisma) {
    return db.user.findFirst({
      where: { id, role: 'ADMIN' },
      select: { ...safeAdministratorSelect, restaurant: { select: { name: true } } },
    });
  }

  findUserByEmail(email: string, db: SuperAdminDatabaseClient = prisma) {
    return db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  createAdministrator(
    data: {
      name: string;
      email: string;
      password: string;
      restaurantId: number;
    },
    db: SuperAdminDatabaseClient = prisma,
  ) {
    return db.user.create({
      data: {
        ...data,
        role: 'ADMIN',
        active: true,
        mustChangePassword: true,
      },
      select: safeAdministratorSelect,
    });
  }

  updateAdministratorAccess(id: number, active: boolean, db: SuperAdminDatabaseClient = prisma) {
    return db.user.update({
      where: { id },
      data: {
        active,
        ...(!active ? { authVersion: { increment: 1 } } : {}),
      },
      select: safeAdministratorSelect,
    });
  }

  revokeRestaurantSessions(restaurantId: number, db: SuperAdminDatabaseClient = prisma) {
    return Promise.all([
      db.user.updateMany({
        where: { restaurantId },
        data: { authVersion: { increment: 1 } },
      }),
      db.authRefreshSession.deleteMany({ where: { user: { restaurantId } } }),
      db.authMfaChallenge.deleteMany({ where: { user: { restaurantId } } }),
    ]);
  }

  revokeUserSessions(userId: number, db: SuperAdminDatabaseClient = prisma) {
    return Promise.all([
      db.authRefreshSession.deleteMany({ where: { userId } }),
      db.authMfaChallenge.deleteMany({ where: { userId } }),
    ]);
  }

  createSupportMessage(
    input: {
      restaurantId: number;
      senderUserId: number;
      senderLabel: string;
      message: string;
    },
    db: SuperAdminDatabaseClient = prisma,
  ) {
    return db.supportChatMessage.create({
      data: {
        ...input,
        senderRole: 'SUPER_ADMIN',
      },
      select: {
        id: true,
        restaurantId: true,
        senderUserId: true,
        senderRole: true,
        senderLabel: true,
        message: true,
        sentAt: true,
      },
    });
  }

  createAuditLog(
    input: AuditContext & {
      actorName: string;
      actorRole: UserRole | string;
      restaurantId?: number | null;
      restaurantName?: string | null;
      action: string;
      resource: string;
      metadata: Prisma.InputJsonObject;
    },
    db: SuperAdminDatabaseClient = prisma,
  ) {
    return db.auditLog.create({
      data: {
        userId: input.actorUserId,
        userName: input.actorName,
        userRole: String(input.actorRole),
        restaurantId: input.restaurantId ?? null,
        restaurantName: input.restaurantName ?? null,
        action: input.action,
        resource: input.resource,
        ipAddress: input.ipAddress,
        requestId: input.requestId,
        userAgent: input.userAgent,
        metadata: input.metadata,
        result: 'SUCCESS',
      },
    });
  }
}

export default new SuperAdminRepository();
