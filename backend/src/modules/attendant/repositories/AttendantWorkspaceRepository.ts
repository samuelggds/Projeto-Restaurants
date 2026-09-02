import {
  OrderStatus,
  PaymentMethod,
  Prisma,
  TableOrderSettlementMode,
  TableParticipantStatus,
  TableServiceCallStatus,
  TableSessionStatus,
} from '@prisma/client';
import type { TenantDbClient } from '../../../database/tenantDbContext.js';

const activeOrderStatuses = [
  OrderStatus.PENDENTE,
  OrderStatus.PREPARANDO,
  OrderStatus.PRONTO,
] as const;

const activeCallStatuses = [
  TableServiceCallStatus.WAITING,
  TableServiceCallStatus.IN_PROGRESS,
] as const;

const operationalPaymentWhere = {
  OR: [
    { settlementMode: TableOrderSettlementMode.TABLE_ACCOUNT },
    {
      NOT: {
        paid: false,
        paymentMethod: { in: [PaymentMethod.PIX, PaymentMethod.CARTAO] },
        payOnDelivery: false,
      },
    },
  ],
} satisfies Prisma.OrderWhereInput;

const attendantOrderSelect = {
  id: true,
  publicId: true,
  type: true,
  status: true,
  createdAt: true,
  readyAt: true,
  table: { select: { number: true } },
  participant: { select: { displayName: true } },
  user: { select: { name: true } },
  items: {
    select: {
      quantity: true,
      product: { select: { name: true } },
    },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.OrderSelect;

const attendantCallSelect = {
  id: true,
  type: true,
  status: true,
  requestedAt: true,
  assignedAt: true,
  resolvedAt: true,
  table: { select: { number: true } },
  assignedTo: { select: { name: true } },
} satisfies Prisma.TableServiceCallSelect;

const attendantSessionSelect = {
  status: true,
  openedAt: true,
  table: { select: { number: true } },
  _count: {
    select: {
      participants: {
        where: {
          status: TableParticipantStatus.ACTIVE,
          revokedAt: null,
        },
      },
      orders: {
        where: {
          status: { in: [...activeOrderStatuses] },
          AND: [operationalPaymentWhere],
        },
      },
      serviceCalls: {
        where: { status: { in: [...activeCallStatuses] } },
      },
    },
  },
} satisfies Prisma.TableSessionSelect;

export class AttendantWorkspaceRepository {
  async load(restaurantId: number, resolvedSince: Date, db: TenantDbClient) {
    const [orders, calls, sessions] = await Promise.all([
      db.order.findMany({
        where: {
          restaurantId,
          status: { in: [...activeOrderStatuses] },
          AND: [operationalPaymentWhere],
        },
        select: attendantOrderSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 200,
      }),
      db.tableServiceCall.findMany({
        where: {
          restaurantId,
          OR: [
            { status: { in: [...activeCallStatuses] } },
            {
              status: TableServiceCallStatus.RESOLVED,
              resolvedAt: { gte: resolvedSince },
            },
          ],
        },
        select: attendantCallSelect,
        orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
        take: 200,
      }),
      db.tableSession.findMany({
        where: {
          restaurantId,
          status: { in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED] },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: attendantSessionSelect,
        orderBy: { table: { number: 'asc' } },
      }),
    ]);

    return { orders, calls, sessions };
  }
}

export default new AttendantWorkspaceRepository();
