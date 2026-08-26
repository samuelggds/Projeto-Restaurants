import {
  OrderStatus,
  Prisma,
  TableOrderFinancialStatus,
  TablePaymentEventType,
  TablePaymentIntentStatus,
} from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { TablePaymentIntentStatus as ContractPaymentStatus } from '../domain/tableAccountContracts.js';
import { assertMoneyCents } from '../domain/tableAccountRules.js';
import { calculateTableBillItemLedger } from '../domain/tablePaymentAllocation.js';

export type TablePaymentTransaction = Prisma.TransactionClient;
type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export function bigintToMoneyCents(value: bigint, fieldName: string) {
  return assertMoneyCents(Number(value), fieldName);
}

export async function lockTablePaymentSession(
  tx: TablePaymentTransaction,
  restaurantId: number,
  tableSessionId: number,
) {
  await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(${restaurantId}, ${tableSessionId})`);
}

export async function loadTablePaymentLedgerItems(
  db: PrismaClientLike,
  restaurantId: number,
  tableSessionId: number,
  now = new Date(),
) {
  const items = await db.tableBillItem.findMany({
    where: {
      restaurantId,
      tableSessionId,
    },
    select: {
      id: true,
      publicId: true,
      participantId: true,
      orderId: true,
      unitPriceCents: true,
      financialStatus: true,
      canceledAt: true,
      createdAt: true,
      order: {
        select: {
          status: true,
        },
      },
      paymentAllocations: {
        select: {
          amountCents: true,
          paymentIntent: {
            select: {
              status: true,
              expiresAt: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  return items.map((item) => {
    const canceled = Boolean(item.canceledAt) || item.order.status === OrderStatus.CANCELADO;
    const ledger = calculateTableBillItemLedger({
      unitPriceCents: bigintToMoneyCents(
        item.unitPriceCents,
        `valor do item financeiro ${item.publicId}`,
      ),
      projectedStatus: item.financialStatus,
      canceled,
      now,
      allocations: item.paymentAllocations.map((allocation) => ({
        amountCents: bigintToMoneyCents(
          allocation.amountCents,
          `alocação do item ${item.publicId}`,
        ),
        intentStatus: allocation.paymentIntent.status as ContractPaymentStatus,
        expiresAt: allocation.paymentIntent.expiresAt,
      })),
    });

    return {
      id: item.id,
      publicId: item.publicId,
      participantId: item.participantId,
      orderId: item.orderId,
      createdAt: item.createdAt,
      canceled,
      currentProjectedStatus: item.financialStatus,
      ...ledger,
    };
  });
}

export async function projectTableSessionFinancialState(
  tx: TablePaymentTransaction,
  restaurantId: number,
  tableSessionId: number,
  now = new Date(),
) {
  const items = await loadTablePaymentLedgerItems(tx, restaurantId, tableSessionId, now);

  for (const item of items) {
    if (item.currentProjectedStatus !== item.projectedStatus) {
      await tx.tableBillItem.update({
        where: { id: item.id },
        data: {
          financialStatus: item.projectedStatus,
          paidAt: item.projectedStatus === 'PAID' ? now : undefined,
        },
      });
    }
  }

  const orders = await tx.order.findMany({
    where: {
      restaurantId,
      tableSessionId,
    },
    select: {
      id: true,
      status: true,
      paid: true,
      paidAt: true,
      tableFinancialStatus: true,
    },
  });

  for (const order of orders) {
    if (order.status === OrderStatus.CANCELADO) {
      continue;
    }

    const activeItems = items.filter(
      (item) => item.orderId === order.id && !item.canceled && item.projectedStatus !== 'REFUNDED',
    );
    if (activeItems.length === 0) {
      continue;
    }

    const allPaid = activeItems.every(
      (item) => item.paidCents === item.unitPriceCents && item.availableCents === 0,
    );
    const hasProcessing = activeItems.some((item) => item.processingCents > 0);
    const hasReservation = activeItems.some((item) => item.reservedCents > 0);
    const financialStatus = allPaid
      ? TableOrderFinancialStatus.PAID
      : hasProcessing
        ? TableOrderFinancialStatus.PROCESSING
        : hasReservation
          ? TableOrderFinancialStatus.RESERVED
          : TableOrderFinancialStatus.UNPAID;

    if (
      order.paid !== allPaid ||
      order.tableFinancialStatus !== financialStatus ||
      (allPaid && !order.paidAt)
    ) {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paid: allPaid,
          tableFinancialStatus: financialStatus,
          paidAt: allPaid ? order.paidAt || now : order.paidAt,
        },
      });
    }
  }

  return items;
}

export async function expireTablePaymentReservations(
  tx: TablePaymentTransaction,
  restaurantId: number,
  tableSessionId: number,
  now = new Date(),
) {
  const expired = await tx.tablePaymentIntent.findMany({
    where: {
      restaurantId,
      tableSessionId,
      status: {
        in: [TablePaymentIntentStatus.RESERVED, TablePaymentIntentStatus.PROCESSING],
      },
      expiresAt: { lte: now },
    },
    select: {
      id: true,
      publicId: true,
      status: true,
      totalCents: true,
    },
  });

  for (const intent of expired) {
    const updated = await tx.tablePaymentIntent.updateMany({
      where: {
        id: intent.id,
        restaurantId,
        tableSessionId,
        status: intent.status,
      },
      data: {
        status: TablePaymentIntentStatus.EXPIRED,
        failedAt: now,
        failureCode: 'RESERVATION_EXPIRED',
      },
    });

    if (updated.count === 1) {
      await tx.tablePaymentEvent.create({
        data: {
          restaurantId,
          tableSessionId,
          paymentIntentId: intent.id,
          deduplicationKey: `table-payment:${intent.publicId}:expired`,
          type: TablePaymentEventType.EXPIRED,
          fromStatus: intent.status,
          toStatus: TablePaymentIntentStatus.EXPIRED,
          amountCents: intent.totalCents,
          occurredAt: now,
        },
      });
    }
  }

  if (expired.length > 0) {
    await projectTableSessionFinancialState(tx, restaurantId, tableSessionId, now);
  }

  return expired.length;
}
