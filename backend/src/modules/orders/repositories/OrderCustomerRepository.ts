import { Prisma } from '@prisma/client';
import type { TenantDbClient } from '../../../database/tenantDbContext.js';

type CustomerSummary = { key: string; name: string; email: string; count: number; total: number };
type CustomerPage = {
  customers: CustomerSummary[];
  total: number;
  summary: { customers: number; returningCustomers: number; totalOrders: number; totalMoved: number };
};

export async function readCustomerPage(db: TenantDbClient, restaurantId: number,
  { search = '', sort = 'VALUE', limit = 12, offset = 0 } = {}) {
  const order = sort === 'NAME' ? Prisma.sql`name ASC, key ASC`
    : sort === 'ORDERS' ? Prisma.sql`count DESC, total DESC, key ASC`
      : Prisma.sql`total DESC, count DESC, key ASC`;
  const [page] = await db.$queryRaw<CustomerPage[]>`
    WITH customer_totals AS (
      SELECT COALESCE(o."userId"::text, u.email, u.name, 'Cliente') AS key,
        COALESCE(MAX(u.name), 'Cliente') AS name,
        COALESCE(NULLIF(MAX(u.email), ''), 'Sem e-mail') AS email,
        COUNT(*)::int AS count, SUM(o.total) AS total
      FROM "Order" o LEFT JOIN "User" u ON u.id = o."userId"
      WHERE o."restaurantId" = ${restaurantId}
        AND (o."settlementMode" = 'TABLE_ACCOUNT' OR o."paymentMethod" IS NULL
          OR o.paid OR o."payOnDelivery" OR o."paymentMethod" NOT IN ('PIX', 'CARTAO'))
      GROUP BY COALESCE(o."userId"::text, u.email, u.name, 'Cliente')
    ), filtered AS (
      SELECT * FROM customer_totals
      WHERE strpos(lower(name || ' ' || email), lower(${search})) > 0
    ), page AS (SELECT * FROM filtered ORDER BY ${order} LIMIT ${limit} OFFSET ${offset})
    SELECT COALESCE((SELECT jsonb_agg(page) FROM page), '[]'::jsonb) AS customers,
      (SELECT COUNT(*)::int FROM filtered) AS total,
      jsonb_build_object('customers', COUNT(*)::int,
        'returningCustomers', COUNT(*) FILTER (WHERE count > 1)::int,
        'totalOrders', COALESCE(SUM(count), 0), 'totalMoved', COALESCE(SUM(total), 0)) AS summary
    FROM customer_totals
  `;
  return { ...page, hasMore: offset + page.customers.length < page.total,
    nextOffset: offset + page.customers.length < page.total ? offset + page.customers.length : null };
}
