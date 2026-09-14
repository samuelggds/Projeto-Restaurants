import { Prisma } from '@prisma/client';
import type { TenantDbClient } from '../../../database/tenantDbContext.js';
import { filteredOrderWhere, type OrderListQuery } from '../domain/orderListQuery.js';

const productSelect = {
  id: true, name: true, image: true, price: true, active: true, stock: true,
  preparationTime: true, restaurantId: true, categoryId: true, configurationVersion: true,
  saleMode: true,
} satisfies Prisma.ProductSelect;

const listInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  restaurant: { select: { id: true, name: true, whatsapp: true } },
  table: { select: { id: true, number: true, active: true, restaurantId: true } },
  participant: { select: { id: true, publicId: true, displayName: true } },
  items: { include: { product: { select: productSelect } } },
  issueThread: { select: {
    orderId: true, isResolved: true, resolvedAt: true, resolvedByName: true,
    messages: { orderBy: { sentAt: 'desc' }, take: 1, select: { senderType: true, message: true } },
  } },
} satisfies Prisma.OrderInclude;

const privateFields = {
  creationRequestKey: true, creationActor: true, creationFingerprint: true,
  refundIdempotencyKey: true, paymentConfirmationPin: true, paymentConfirmationPinExpiresAt: true,
  paymentProof: true, paymentProofImage: true,
} satisfies Prisma.OrderOmit;

export const emptyOrderSummary = () => ({ total: 0, active: 0, awaitingPayment: 0, inProgress: 0, delivered: 0 });

export async function readOrderPage(
  db: TenantDbClient,
  base: Prisma.OrderWhereInput,
  query: OrderListQuery,
  { ascending = false, waiter = false, includeSummary = false } = {},
) {
  const where = filteredOrderWhere(base, query);
  const rows = await db.order.findMany({
    where: { AND: [where, ...(query.cursor ? [{ id: ascending ? { gt: query.cursor } : { lt: query.cursor } }] : [])] },
    orderBy: { id: ascending ? 'asc' : 'desc' },
    take: query.limit + 1,
    omit: privateFields,
    include: waiter ? {
      user: { select: { id: true, name: true } },
      table: { select: { id: true, number: true } },
      items: { include: { product: { select: productSelect } } },
    } : listInclude,
  });
  const total = await db.order.count({ where });
  const summary = emptyOrderSummary();
  if (includeSummary) {
    const groups = await db.order.groupBy({ by: ['status', 'paid'], where: base, _count: true });
    for (const group of groups) {
      const count = group._count;
      summary.total += count;
      if (!['ENTREGUE', 'CANCELADO'].includes(group.status)) summary.active += count;
      if (!group.paid && group.status !== 'CANCELADO') summary.awaitingPayment += count;
      if (['PREPARANDO', 'PRONTO', 'SAIU_PARA_ENTREGA'].includes(group.status)) summary.inProgress += count;
      if (group.status === 'ENTREGUE') summary.delivered += count;
    }
  }
  const hasMore = rows.length > query.limit;
  const orders = rows.slice(0, query.limit);
  return { orders, total, hasMore, nextCursor: hasMore ? orders.at(-1)!.id : null,
    ...(includeSummary ? { summary } : {}) };
}
