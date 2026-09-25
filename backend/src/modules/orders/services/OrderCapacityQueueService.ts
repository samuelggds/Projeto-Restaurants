import { OrderStatus, Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import kitchenPrintingService from '../../kitchenPrinting/services/KitchenPrintingService.js';
import orderRepository from '../repositories/OrderRepository.js';
import {
  countActiveOrderCapacity,
  isOrderCapacityQueued,
  lockOrderCapacity,
  normalizeOrderCapacityLimit,
  operationalPaymentWhere,
} from '../utils/orderCapacity.js';

type AdmittedOrder = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

type AdmissionResult = {
  admitted: AdmittedOrder[];
};

async function admitWithinTransaction(
  tx: Prisma.TransactionClient,
  restaurantId: number,
): Promise<AdmissionResult> {
  await setTenantDbContext(tx, restaurantId);
  await lockOrderCapacity(tx, restaurantId);

  const settings = await tx.restaurantSettings.findUnique({
    where: { restaurantId },
    select: { maxConcurrentOrders: true, autoAcceptOrders: true },
  });
  const limit = normalizeOrderCapacityLimit(settings?.maxConcurrentOrders);
  const active = await countActiveOrderCapacity(tx, restaurantId);
  const available = Math.max(0, limit - active);
  if (!available) return { admitted: [] };

  const candidates = await tx.order.findMany({
    where: {
      restaurantId,
      capacityQueuedAt: { not: null },
      capacityAdmittedAt: null,
      status: { notIn: [OrderStatus.ENTREGUE, OrderStatus.CANCELADO] },
      AND: [operationalPaymentWhere],
    },
    orderBy: [{ capacityQueuedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    take: available,
    select: { id: true },
  });
  if (!candidates.length) return { admitted: [] };

  const now = new Date();
  const admitted = [];
  for (const candidate of candidates) {
    const nextStatus = settings?.autoAcceptOrders ? OrderStatus.PREPARANDO : OrderStatus.PENDENTE;
    const changed = await tx.order.updateMany({
      where: {
        id: candidate.id,
        restaurantId,
        capacityQueuedAt: { not: null },
        capacityAdmittedAt: null,
        status: { notIn: [OrderStatus.ENTREGUE, OrderStatus.CANCELADO] },
      },
      data: {
        capacityAdmittedAt: now,
        status: nextStatus,
        preparationStartedAt: nextStatus === OrderStatus.PREPARANDO ? now : null,
      },
    });
    if (changed.count !== 1) continue;

    await kitchenPrintingService.enqueueAutomatic({
      restaurantId,
      orderId: candidate.id,
      event: 'OPERATIONAL_NEW_ORDER',
      db: tx,
    });
    const current = await orderRepository.findById(candidate.id, restaurantId, tx);
    if (current) admitted.push(current);
  }

  return { admitted };
}

export class OrderCapacityQueueService {
  async drainRestaurant(restaurantId: number) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      return [];
    }

    const result = await withTenantDbContext(normalizedRestaurantId, (tx) =>
      admitWithinTransaction(tx, normalizedRestaurantId),
    );

    for (const order of result.admitted) {
      io.to(`restaurant:${normalizedRestaurantId}`).emit('new-order', order);
      io.to(`restaurant:${normalizedRestaurantId}`).emit('order:status-changed', order);
      if (order.userId) {
        io.to(`user:${order.userId}`).emit('new-order', order);
        io.to(`user:${order.userId}`).emit('order:status-changed', order);
      }
    }

    return result.admitted;
  }

  async drainAll() {
    const queued = await prisma.order.findMany({
      where: {
        capacityQueuedAt: { not: null },
        capacityAdmittedAt: null,
        status: { notIn: [OrderStatus.ENTREGUE, OrderStatus.CANCELADO] },
      },
      distinct: ['restaurantId'],
      select: { restaurantId: true },
      take: 500,
    });

    let admittedCount = 0;
    for (const row of queued) {
      admittedCount += (await this.drainRestaurant(row.restaurantId)).length;
    }
    return { restaurantsChecked: queued.length, admittedCount };
  }

  async ensureDigitalPaymentQueueState(
    tx: Prisma.TransactionClient,
    orderId: number,
    restaurantId: number,
  ) {
    const order = await tx.order.findFirst({
      where: { id: orderId, restaurantId },
      select: {
        id: true,
        capacityQueuedAt: true,
        capacityAdmittedAt: true,
      },
    });
    return order ? isOrderCapacityQueued(order) : false;
  }
}

export default new OrderCapacityQueueService();
