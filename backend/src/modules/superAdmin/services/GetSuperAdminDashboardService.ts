import { SuperAdminError } from '../domain/superAdminErrors.js';
import {
  calculateMrr,
  decimalToNumber,
  deriveSupportTicketStatus,
  deriveTenantStatus,
  monthBuckets,
  toIso,
} from '../domain/superAdminMappings.js';
import { getPublicSystemPolicies } from '../domain/systemPolicies.js';
import superAdminRepository, {
  type SuperAdminRepository,
} from '../repositories/SuperAdminRepository.js';
import {
  presentAdministrator,
  presentInvoice,
  presentPlatformPlan,
  presentPlatformSettings,
  presentSubscription,
} from './superAdminPresenters.js';

export class GetSuperAdminDashboardService {
  constructor(private readonly repository: SuperAdminRepository = superAdminRepository) {}

  async execute(now = new Date()) {
    const snapshot = await this.repository.loadDashboardSnapshot(now);
    if (!snapshot.settings) {
      throw new SuperAdminError(
        'Configurações da plataforma não foram inicializadas. Aplique as migrations.',
        503,
        'PLATFORM_SETTINGS_MISSING',
      );
    }

    const feesByPlan = new Map(
      snapshot.plans.map((plan) => [plan.code, decimalToNumber(plan.monthlyFee)]),
    );
    const planCounts = new Map<string, number>();
    const monthlyRevenueByRestaurant = new Map(
      snapshot.monthlyOrdersByRestaurant.map((row) => [
        row.restaurantId,
        decimalToNumber(row._sum.total),
      ]),
    );

    const restaurants = snapshot.restaurants.map((restaurant) => {
      const subscription = restaurant.subscription;
      if (subscription?.plan) {
        planCounts.set(subscription.plan, (planCounts.get(subscription.plan) ?? 0) + 1);
      }

      const primaryAdmin = restaurant.users[0] ?? null;
      const lastAccess = restaurant.users.reduce<Date | null>((latest, administrator) => {
        if (!administrator.lastLoginAt) return latest;
        return !latest || administrator.lastLoginAt > latest ? administrator.lastLoginAt : latest;
      }, null);

      return {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        email: restaurant.email,
        phone: restaurant.phone,
        active: restaurant.active,
        accessBlockReason: restaurant.accessBlockReason,
        status: deriveTenantStatus({
          active: restaurant.active,
          subscriptionStatus: subscription?.status,
          hasOverdueInvoice: restaurant.invoices.length > 0,
        }),
        createdAt: restaurant.createdAt.toISOString(),
        lastAccessAt: toIso(lastAccess),
        nextBillingAt: toIso(subscription?.currentPeriodEnd),
        monthlyFee: subscription ? (feesByPlan.get(subscription.plan) ?? 0) : 0,
        monthlyOrderRevenue: monthlyRevenueByRestaurant.get(restaurant.id) ?? 0,
        primaryAdmin: primaryAdmin ? presentAdministrator(primaryAdmin, restaurant.name) : null,
        subscription: presentSubscription(subscription),
      };
    });

    const statusCounts = restaurants.reduce<Record<string, number>>((counts, restaurant) => {
      counts[restaurant.status] = (counts[restaurant.status] ?? 0) + 1;
      return counts;
    }, {});
    const buckets = monthBuckets(now);
    const monthlyRevenue = buckets.map((bucket) => ({
      label: bucket.label,
      value: snapshot.monthlyPaidInvoices.reduce((sum, invoice) => {
        const paidAt = invoice.paidAt;
        return paidAt && paidAt >= bucket.start && paidAt < bucket.end
          ? sum + decimalToNumber(invoice.total)
          : sum;
      }, 0),
    }));
    const monthlyGrowth = buckets.map((bucket) => ({
      label: bucket.label,
      count: snapshot.restaurants.filter(
        (restaurant) => restaurant.active && restaurant.createdAt < bucket.end,
      ).length,
    }));
    const mrr = calculateMrr(
      snapshot.restaurants.flatMap((restaurant) =>
        restaurant.subscription
          ? [{ status: restaurant.subscription.status, plan: restaurant.subscription.plan }]
          : [],
      ),
      feesByPlan,
    );

    return {
      restaurants,
      metrics: {
        restaurantsTotal: restaurants.length,
        restaurantsActive: statusCounts.ACTIVE ?? 0,
        restaurantsTrial: statusCounts.TRIAL ?? 0,
        restaurantsOverdue: statusCounts.OVERDUE ?? 0,
        restaurantsBlocked: statusCounts.BLOCKED ?? 0,
        restaurantsCanceled: statusCounts.CANCELED ?? 0,
        totalGenerated: decimalToNumber(snapshot.generatedInvoicesAggregate._sum.total),
        totalReceivable: decimalToNumber(snapshot.openInvoicesAggregate._sum.total),
        pendingInvoicesCount: snapshot.openInvoicesCount,
        pendingInvoicesTotal: decimalToNumber(snapshot.openInvoicesAggregate._sum.total),
        mrr,
        monthlyGrowthBasis: 'CURRENTLY_ACTIVE_RESTAURANTS_CUMULATIVE_BY_REGISTRATION_DATE',
        monthlyGrowth,
        monthlyRevenue,
      },
      plans: snapshot.plans.map((plan) =>
        presentPlatformPlan(plan, planCounts.get(plan.code) ?? 0),
      ),
      invoices: snapshot.invoices.map((invoice) => presentInvoice(invoice)),
      administrators: snapshot.administrators.map((administrator) =>
        presentAdministrator(administrator),
      ),
      tickets: snapshot.supportTickets.map((ticket) => ({
        restaurantId: ticket.restaurantId,
        id: ticket.id,
        restaurant: ticket.restaurantName,
        subject: ticket.subject.slice(0, 100),
        status: deriveSupportTicketStatus(ticket.senderRole, ticket.issueStatus),
        messageCount: Number(ticket.messageCount),
        lastMessageAt: ticket.sentAt.toISOString(),
        lastSenderRole: ticket.senderRole,
      })),
      auditLogs: snapshot.auditLogs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        user: log.userName,
        role: log.userRole,
        restaurant: log.restaurantName,
        action: log.action,
        resource: log.resource,
        ip: log.ipAddress,
        requestId: log.requestId,
        userAgent: log.userAgent,
        metadata: log.metadata,
        result: log.result,
      })),
      settings: presentPlatformSettings(snapshot.settings),
      systemPolicies: getPublicSystemPolicies(process.env, snapshot.settings),
    };
  }
}

export default new GetSuperAdminDashboardService();
