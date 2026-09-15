import { OrderRefundStatus, OrderStatus, Prisma } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { getRestaurantPeriodBoundaries } from '../../courierCompensation/domain/restaurantTimePeriods.js';
import { sanitizeAdminAiContext } from '../domain/adminAiSecurityPolicy.js';

type Actor = {
  userId: number;
  restaurantId: number;
  userRole?: string | null;
};

function money(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function count(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function assertActor(actor: Actor) {
  if (
    String(actor.userRole || '').toUpperCase() !== 'ADMIN' ||
    !Number.isSafeInteger(Number(actor.restaurantId)) ||
    Number(actor.restaurantId) <= 0
  ) {
    throw new Error('Conta ADMIN inválida para consultar o assistente do restaurante.');
  }
}

class AdminRestaurantFallbackSnapshotService {
  async execute(actor: Actor) {
    assertActor(actor);
    const restaurantId = Number(actor.restaurantId);
    const now = new Date();

    return withTenantDbContext(restaurantId, async (db) => {
      const restaurantSettings = await db.restaurantSettings.findUnique({
        where: { restaurantId },
        select: { timezone: true },
      });
      const timeZone = restaurantSettings?.timezone || 'America/Sao_Paulo';
      const periods = getRestaurantPeriodBoundaries(now, timeZone);
      const currentStart = periods.week.gte;
      const currentEnd = new Date(Math.min(periods.week.lt.getTime(), now.getTime()));
      const elapsedMs = Math.max(0, currentEnd.getTime() - currentStart.getTime());
      const previousWeek = getRestaurantPeriodBoundaries(
        new Date(currentStart.getTime() - 1),
        timeZone,
      ).week;
      const previousStart = previousWeek.gte;
      const previousEnd = new Date(
        Math.min(previousWeek.lt.getTime(), previousStart.getTime() + elapsedMs),
      );

      const registeredAggregate = async (gte: Date, lt: Date) => {
        const result = await db.order.aggregate({
          where: { restaurantId, createdAt: { gte, lt }, status: { not: OrderStatus.CANCELADO } },
          _count: true,
          _sum: { total: true },
        });
        return { count: result._count, total: money(result._sum.total) };
      };
      const paidAggregate = async (gte: Date, lt: Date) => {
        const result = await db.order.aggregate({
          where: {
            restaurantId,
            paid: true,
            paidAt: { gte, lt },
            status: { not: OrderStatus.CANCELADO },
          },
          _count: true,
          _sum: { total: true },
        });
        return { count: result._count, total: money(result._sum.total) };
      };

      const [
        registered,
        previousRegistered,
        confirmedPayments,
        previousConfirmedPayments,
        cancellationsResult,
        refundsResult,
        products,
        activeOrders,
        topProductRows,
      ] = await Promise.all([
        registeredAggregate(currentStart, currentEnd),
        registeredAggregate(previousStart, previousEnd),
        paidAggregate(currentStart, currentEnd),
        paidAggregate(previousStart, previousEnd),
        db.order.aggregate({
          where: {
            restaurantId,
            createdAt: { gte: currentStart, lt: currentEnd },
            status: OrderStatus.CANCELADO,
          },
          _count: true,
          _sum: { total: true },
        }),
        db.order.aggregate({
          where: {
            restaurantId,
            refundStatus: OrderRefundStatus.SUCCEEDED,
            refundedAt: { gte: currentStart, lt: currentEnd },
          },
          _count: true,
          _sum: { total: true },
        }),
        db.product.findMany({
          where: { restaurantId },
          select: { id: true, name: true, description: true, image: true, stock: true, active: true },
          orderBy: { name: 'asc' },
          take: 1000,
        }),
        db.order.findMany({
          where: {
            restaurantId,
            status: {
              in: [
                OrderStatus.PENDENTE,
                OrderStatus.PREPARANDO,
                OrderStatus.PRONTO,
                OrderStatus.SAIU_PARA_ENTREGA,
              ],
            },
          },
          select: { id: true, status: true, total: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 20,
        }),
        db.$queryRaw<
          Array<{
            productId: number;
            name: string;
            quantity: bigint | number;
            grossSales: Prisma.Decimal | number | string;
          }>
        >(Prisma.sql`
          SELECT
            product."id" AS "productId",
            product."name" AS "name",
            SUM(item."quantity")::bigint AS "quantity",
            SUM(item."price" * item."quantity") AS "grossSales"
          FROM "OrderItem" item
          JOIN "Order" order_row ON order_row."id" = item."orderId"
          JOIN "Product" product ON product."id" = item."productId"
          WHERE order_row."restaurantId" = ${restaurantId}
            AND product."restaurantId" = ${restaurantId}
            AND order_row."createdAt" >= ${currentStart}
            AND order_row."createdAt" < ${currentEnd}
            AND order_row."status" <> 'CANCELADO'
          GROUP BY product."id", product."name"
          ORDER BY SUM(item."quantity") DESC, SUM(item."price" * item."quantity") DESC
          LIMIT 8
        `),
      ]);

      const cancellations = {
        count: cancellationsResult._count,
        total: money(cancellationsResult._sum.total),
      };
      const refunds = { count: refundsResult._count, total: money(refundsResult._sum.total) };
      const topProducts = topProductRows.map((row) => ({
        productId: Number(row.productId),
        name: row.name,
        quantity: count(row.quantity),
        grossSales: money(row.grossSales),
        target: 'catalog',
      }));
      const catalog = {
        totalProducts: products.length,
        activeProducts: products.filter((product) => product.active !== false).length,
        missingDescription: products
          .filter((product) => !String(product.description || '').trim())
          .map((product) => ({ productId: product.id, name: product.name })),
        missingImage: products
          .filter((product) => !String(product.image || '').trim())
          .map((product) => ({ productId: product.id, name: product.name })),
        lowStock: products
          .filter(
            (product) =>
              product.active !== false &&
              product.stock !== null &&
              product.stock !== undefined &&
              Number(product.stock) <= 3,
          )
          .map((product) => ({ productId: product.id, name: product.name, stock: Number(product.stock), threshold: 3 })),
      };
      const attentionOrders = activeOrders.map((order) => ({
        orderId: order.id,
        status: order.status,
        total: money(order.total),
        minutesInState: Math.max(0, Math.floor((now.getTime() - order.createdAt.getTime()) / 60_000)),
        thresholdMinutes: null,
      }));

      return sanitizeAdminAiContext({
        generatedAt: now.toISOString(),
        dataUpdatedAt: now.toISOString(),
        timeZone,
        period: {
          label: 'Semana atual',
          start: currentStart.toISOString(),
          end: currentEnd.toISOString(),
          previousStart: previousStart.toISOString(),
          previousEnd: previousEnd.toISOString(),
        },
        sales: {
          registered,
          confirmedPayments,
          cancellations,
          refunds,
          comparison: {
            registeredSalesPercent: percentChange(registered.total, previousRegistered.total),
            confirmedPaymentsPercent: percentChange(
              confirmedPayments.total,
              previousConfirmedPayments.total,
            ),
            previousRegistered,
            previousConfirmedPayments,
          },
          definitions: {
            registered: 'Pedidos não cancelados criados no período.',
            confirmedPayments: 'Pedidos com pagamento confirmado no período.',
            cancellations: 'Pedidos criados no período cujo estado atual é CANCELADO.',
            refunds: 'Pedidos com estorno concluído no período.',
            warning: 'Vendas/faturamento operacional não são lucro.',
          },
        },
        topProducts,
        attentionOrders,
        catalog,
        settlements: { employeesPending: 0, couriersPending: 0 },
        priorities: [],
        commercial: {
          decliningCustomers: [],
          frequentlyBoughtTogether: [],
          decliningProducts: [],
          campaignDrafts: [],
          note: 'Visão resiliente temporária: análises avançadas ficam disponíveis quando o armazenamento do assistente estiver atualizado.',
        },
        forecast: {
          available: false,
          warning: 'Previsão avançada temporariamente indisponível nesta visão resiliente.',
        },
        paymentConfiguration: {
          providerConfigured: {},
          note: 'Credenciais nunca entram no contexto da IA.',
        },
        limitations: [
          'Visão resiliente ativa porque o armazenamento novo do assistente ainda não está disponível.',
          'A resposta continua isolada ao restaurante autenticado.',
        ],
      });
    });
  }
}

export default new AdminRestaurantFallbackSnapshotService();
