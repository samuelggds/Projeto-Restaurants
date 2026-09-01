import {
  CourierSettlementStatus,
  OrderStatus,
  PaymentMethod,
  UserRole,
  type Prisma,
} from '@prisma/client';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { centsToMoney, moneyToCents } from '../domain/money.js';
import { assertCourier, auditCourierFinance } from './CourierCompensationService.js';

type Actor = { userId: number; role: string };

const settlementInclude = {
  courier: { select: { id: true, name: true, email: true } },
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      order: {
        select: {
          id: true,
          publicId: true,
          deliveredAt: true,
          district: true,
          city: true,
          total: true,
        },
      },
    },
  },
} satisfies Prisma.CourierSettlementInclude;

function normalizeId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} inválido.`);
  return id;
}

function serializeSettlement(settlement: any) {
  return {
    ...settlement,
    grossCourierEarnings: Number(settlement.grossCourierEarnings),
    cashCollectedAmount: Number(settlement.cashCollectedAmount),
    netAmount: Number(settlement.netAmount),
    direction:
      Number(settlement.netAmount) > 0
        ? 'RESTAURANT_PAYS_COURIER'
        : Number(settlement.netAmount) < 0
          ? 'COURIER_RETURNS_CASH'
          : 'BALANCED',
    items: settlement.items.map((item: any) => ({
      ...item,
      courierEarningSnapshot: Number(item.courierEarningSnapshot),
      cashCollectedSnapshot: Number(item.cashCollectedSnapshot),
      order: { ...item.order, total: Number(item.order.total) },
    })),
  };
}

function cashCollectedByOrder(order: {
  payOnDelivery: boolean;
  payOnDeliveryMethod: PaymentMethod | null;
  paid: boolean;
  total: unknown;
}) {
  return order.payOnDelivery && order.payOnDeliveryMethod === PaymentMethod.DINHEIRO && order.paid
    ? moneyToCents(order.total, 'Total recebido em dinheiro')
    : 0n;
}

class CourierSettlementService {
  async listPendingOrders(input: { restaurantId: unknown; courierId?: unknown }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = input.courierId ? normalizeId(input.courierId, 'Motoqueiro') : undefined;
    return withTenantDbContext(restaurantId, async (db) => {
      const orders = await db.order.findMany({
        where: {
          restaurantId,
          ...(courierId ? { assignedCourierId: courierId } : {}),
          assignedCourierId: courierId || { not: null },
          status: OrderStatus.ENTREGUE,
          courierPaidAt: null,
          courierSettlementItems: { none: { restaurantId, active: true } },
        },
        select: {
          id: true,
          publicId: true,
          assignedCourierId: true,
          courierEarning: true,
          deliveredAt: true,
          district: true,
          city: true,
          total: true,
          paid: true,
          payOnDelivery: true,
          payOnDeliveryMethod: true,
          assignedCourier: { select: { id: true, name: true } },
        },
        orderBy: { deliveredAt: 'asc' },
        take: 500,
      });
      return orders.map((order) => ({
        ...order,
        courierEarning: Number(order.courierEarning),
        total: Number(order.total),
        cashCollectedAmount: Number(cashCollectedByOrder(order)) / 100,
      }));
    });
  }

  async create(input: {
    restaurantId: unknown;
    courierId: unknown;
    orderIds: unknown[];
    paymentMethod?: any;
    adminNote?: string | null;
    evidenceUrl?: string | null;
    actor: Actor;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = normalizeId(input.courierId, 'Motoqueiro');
    const orderIds = [...new Set(input.orderIds.map((id) => normalizeId(id, 'Pedido')))];
    if (!orderIds.length || orderIds.length > 200) {
      throw new Error('Selecione entre 1 e 200 entregas para o acerto.');
    }

    try {
      return await withTenantDbContext(restaurantId, async (db) => {
        await assertCourier(db, restaurantId, courierId);
        const orders = await db.order.findMany({
          where: {
            id: { in: orderIds },
            restaurantId,
            assignedCourierId: courierId,
            status: OrderStatus.ENTREGUE,
            courierPaidAt: null,
          },
          select: {
            id: true,
            courierEarning: true,
            total: true,
            paid: true,
            payOnDelivery: true,
            payOnDeliveryMethod: true,
          },
        });
        if (orders.length !== orderIds.length) {
          throw new Error(
            'Uma ou mais entregas não pertencem a este motoqueiro ou já foram pagas.',
          );
        }
        const alreadyIncluded = await db.courierSettlementItem.findFirst({
          where: { restaurantId, orderId: { in: orderIds }, active: true },
          select: { orderId: true },
        });
        if (alreadyIncluded)
          throw new Error('Uma das entregas já participa de outro acerto ativo.');

        const snapshots = orders.map((order) => ({
          orderId: order.id,
          earning: moneyToCents(order.courierEarning, 'Ganho do motoqueiro'),
          cash: cashCollectedByOrder(order),
        }));
        const gross = snapshots.reduce((sum, item) => sum + item.earning, 0n);
        const cash = snapshots.reduce((sum, item) => sum + item.cash, 0n);
        const settlement = await db.courierSettlement.create({
          data: {
            restaurantId,
            courierId,
            grossCourierEarnings: centsToMoney(gross),
            cashCollectedAmount: centsToMoney(cash),
            netAmount: centsToMoney(gross - cash),
            paymentMethod: input.paymentMethod || null,
            adminNote: input.adminNote || null,
            evidenceUrl: input.evidenceUrl || null,
            adminDeclaredPaidAt: new Date(),
            createdByUserId: input.actor.userId,
          },
          select: { id: true, publicId: true },
        });
        await db.courierSettlementItem.createMany({
          data: snapshots.map((snapshot) => ({
            settlementId: settlement.id,
            restaurantId,
            orderId: snapshot.orderId,
            courierEarningSnapshot: centsToMoney(snapshot.earning),
            cashCollectedSnapshot: centsToMoney(snapshot.cash),
          })),
        });
        await auditCourierFinance(db, {
          ...input.actor,
          restaurantId,
          action: 'COURIER_SETTLEMENT_CREATED',
          resource: `CourierSettlement:${settlement.publicId}`,
          metadata: { courierId, orderCount: orderIds.length },
        });
        const created = await db.courierSettlement.findFirstOrThrow({
          where: { id: settlement.id, restaurantId },
          include: settlementInclude,
        });
        return serializeSettlement(created);
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new Error(
          'Uma das entregas acabou de ser incluída em outro acerto. Atualize a lista.',
        );
      }
      throw error;
    }
  }

  async listAdmin(input: {
    restaurantId: unknown;
    courierId?: unknown;
    status?: CourierSettlementStatus;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = input.courierId ? normalizeId(input.courierId, 'Motoqueiro') : undefined;
    return withTenantDbContext(restaurantId, async (db) => {
      const settlements = await db.courierSettlement.findMany({
        where: {
          restaurantId,
          ...(courierId ? { courierId } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
        include: settlementInclude,
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return settlements.map(serializeSettlement);
    });
  }

  async listCourier(input: { restaurantId: unknown; courierId: unknown }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = normalizeId(input.courierId, 'Motoqueiro');
    return withTenantDbContext(restaurantId, async (db) => {
      await assertCourier(db, restaurantId, courierId);
      const settlements = await db.courierSettlement.findMany({
        where: { restaurantId, courierId },
        include: settlementInclude,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return settlements.map(serializeSettlement);
    });
  }

  async confirm(input: {
    restaurantId: unknown;
    courierId: unknown;
    publicId: string;
    actor: Actor;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = normalizeId(input.courierId, 'Motoqueiro');
    return withTenantDbContext(restaurantId, async (db) => {
      await assertCourier(db, restaurantId, courierId);
      const current = await db.courierSettlement.findFirst({
        where: { publicId: input.publicId, restaurantId, courierId },
        include: { items: { where: { restaurantId, active: true }, select: { orderId: true } } },
      });
      if (!current) throw new Error('Acerto não encontrado.');
      if (current.status === CourierSettlementStatus.CONFIRMED) {
        const confirmed = await db.courierSettlement.findFirstOrThrow({
          where: { id: current.id, restaurantId, courierId },
          include: settlementInclude,
        });
        return serializeSettlement(confirmed);
      }
      if (current.status !== CourierSettlementStatus.AWAITING_COURIER_CONFIRMATION) {
        throw new Error('Este acerto não está aguardando confirmação.');
      }
      const now = new Date();
      const changed = await db.courierSettlement.updateMany({
        where: {
          id: current.id,
          restaurantId,
          courierId,
          status: CourierSettlementStatus.AWAITING_COURIER_CONFIRMATION,
        },
        data: {
          status: CourierSettlementStatus.CONFIRMED,
          courierConfirmedAt: now,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('O acerto foi atualizado por outra sessão.');
      const paidOrders = await db.order.updateMany({
        where: {
          id: { in: current.items.map((item) => item.orderId) },
          restaurantId,
          assignedCourierId: courierId,
          status: OrderStatus.ENTREGUE,
          courierPaidAt: null,
        },
        data: { courierPaidAt: now },
      });
      if (paidOrders.count !== current.items.length) {
        throw new Error(
          'Uma ou mais entregas do acerto mudaram de estado. A confirmação foi cancelada.',
        );
      }
      await auditCourierFinance(db, {
        ...input.actor,
        restaurantId,
        action: 'COURIER_SETTLEMENT_CONFIRMED',
        resource: `CourierSettlement:${input.publicId}`,
        metadata: { courierId, orderCount: current.items.length },
      });
      const confirmed = await db.courierSettlement.findFirstOrThrow({
        where: { id: current.id, restaurantId, courierId },
        include: settlementInclude,
      });
      return serializeSettlement(confirmed);
    });
  }

  async dispute(input: {
    restaurantId: unknown;
    courierId: unknown;
    publicId: string;
    reason: string;
    actor: Actor;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const courierId = normalizeId(input.courierId, 'Motoqueiro');
    return withTenantDbContext(restaurantId, async (db) => {
      await assertCourier(db, restaurantId, courierId);
      const changed = await db.courierSettlement.updateMany({
        where: {
          publicId: input.publicId,
          restaurantId,
          courierId,
          status: CourierSettlementStatus.AWAITING_COURIER_CONFIRMATION,
        },
        data: {
          status: CourierSettlementStatus.DISPUTED,
          disputeReason: input.reason,
          disputedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1)
        throw new Error('Acerto não encontrado ou não está aguardando confirmação.');
      await auditCourierFinance(db, {
        ...input.actor,
        restaurantId,
        action: 'COURIER_SETTLEMENT_DISPUTED',
        resource: `CourierSettlement:${input.publicId}`,
        metadata: { courierId },
      });
      const settlement = await db.courierSettlement.findFirstOrThrow({
        where: { publicId: input.publicId, restaurantId, courierId },
        include: settlementInclude,
      });
      return serializeSettlement(settlement);
    });
  }

  async cancel(input: { restaurantId: unknown; publicId: string; actor: Actor }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    return withTenantDbContext(restaurantId, async (db) => {
      const settlement = await db.courierSettlement.findFirst({
        where: {
          publicId: input.publicId,
          restaurantId,
          status: {
            in: [
              CourierSettlementStatus.AWAITING_COURIER_CONFIRMATION,
              CourierSettlementStatus.DISPUTED,
            ],
          },
        },
        select: { id: true, courierId: true },
      });
      if (!settlement) throw new Error('Acerto não encontrado ou não pode mais ser cancelado.');
      const now = new Date();
      const canceled = await db.courierSettlement.updateMany({
        where: {
          id: settlement.id,
          restaurantId,
          status: {
            in: [
              CourierSettlementStatus.AWAITING_COURIER_CONFIRMATION,
              CourierSettlementStatus.DISPUTED,
            ],
          },
        },
        data: {
          status: CourierSettlementStatus.CANCELED,
          canceledAt: now,
          canceledByUserId: input.actor.userId,
          version: { increment: 1 },
        },
      });
      if (canceled.count !== 1) {
        throw new Error('O acerto foi confirmado ou atualizado por outra sessão.');
      }
      await db.courierSettlementItem.updateMany({
        where: { settlementId: settlement.id, restaurantId, active: true },
        data: { active: false, releasedAt: now },
      });
      await auditCourierFinance(db, {
        ...input.actor,
        restaurantId,
        action: 'COURIER_SETTLEMENT_CANCELED',
        resource: `CourierSettlement:${input.publicId}`,
        metadata: { courierId: settlement.courierId },
      });
      return { canceled: true };
    });
  }
}

export { cashCollectedByOrder };
export default new CourierSettlementService();
