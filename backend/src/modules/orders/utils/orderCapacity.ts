import {
  OrderStatus,
  PaymentMethod,
  Prisma,
  TableOrderSettlementMode,
} from '@prisma/client';

type Db = Prisma.TransactionClient;

export const CAPACITY_ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDENTE,
  OrderStatus.PREPARANDO,
  OrderStatus.PRONTO,
  OrderStatus.SAIU_PARA_ENTREGA,
];

export const operationalPaymentWhere = {
  OR: [
    { settlementMode: TableOrderSettlementMode.TABLE_ACCOUNT },
    { paymentMethod: null },
    { paid: true },
    { payOnDelivery: true },
    { paymentMethod: { notIn: [PaymentMethod.PIX, PaymentMethod.CARTAO] } },
  ],
} satisfies Prisma.OrderWhereInput;

export const admittedCapacityWhere = {
  OR: [{ capacityQueuedAt: null }, { capacityAdmittedAt: { not: null } }],
} satisfies Prisma.OrderWhereInput;

export function normalizeOrderCapacityLimit(configuredLimit: unknown) {
  return Math.min(500, Math.max(1, Number(configuredLimit) || 20));
}

export function isOrderCapacityQueued(order: {
  capacityQueuedAt?: Date | string | null;
  capacityAdmittedAt?: Date | string | null;
}) {
  return Boolean(order.capacityQueuedAt && !order.capacityAdmittedAt);
}

export async function lockOrderCapacity(db: Db, restaurantId: number) {
  await db.$queryRaw<Array<{ lockAcquired: number }>>`
    SELECT 1::int AS "lockAcquired"
    FROM pg_advisory_xact_lock(73421, ${restaurantId}::int)
  `;
}

export async function countActiveOrderCapacity(db: Db, restaurantId: number) {
  return db.order.count({
    where: {
      restaurantId,
      status: { in: CAPACITY_ACTIVE_STATUSES },
      AND: [operationalPaymentWhere, admittedCapacityWhere],
    },
  });
}

export async function shouldQueueOperationalOrder(
  db: Db,
  restaurantId: number,
  configuredLimit: unknown,
) {
  await lockOrderCapacity(db, restaurantId);
  const activeOrders = await countActiveOrderCapacity(db, restaurantId);
  return activeOrders >= normalizeOrderCapacityLimit(configuredLimit);
}

function isDeferredDigitalPayment(order: {
  payOnDelivery: boolean;
  paymentMethod: PaymentMethod | null;
  settlementMode: TableOrderSettlementMode | null;
}) {
  return (
    order.payOnDelivery !== true &&
    order.settlementMode !== TableOrderSettlementMode.TABLE_ACCOUNT &&
    (order.paymentMethod === PaymentMethod.PIX || order.paymentMethod === PaymentMethod.CARTAO)
  );
}

export async function queueDigitalOrderBeforePaymentConfirmation(
  db: Db,
  orderId: number,
  restaurantId: number,
) {
  const order = await db.order.findFirst({
    where: { id: orderId, restaurantId },
    select: {
      id: true,
      paid: true,
      status: true,
      payOnDelivery: true,
      paymentMethod: true,
      settlementMode: true,
      capacityQueuedAt: true,
      capacityAdmittedAt: true,
    },
  });

  if (!order || order.paid === true || order.status === OrderStatus.CANCELADO) {
    return Boolean(order && isOrderCapacityQueued(order));
  }
  if (!isDeferredDigitalPayment(order)) return isOrderCapacityQueued(order);

  await lockOrderCapacity(db, restaurantId);
  const settings = await db.restaurantSettings.findUnique({
    where: { restaurantId },
    select: { maxConcurrentOrders: true },
  });
  const activeOrders = await countActiveOrderCapacity(db, restaurantId);
  const full = activeOrders >= normalizeOrderCapacityLimit(settings?.maxConcurrentOrders);

  if (!full) return false;

  const queuedAt = order.capacityQueuedAt || new Date();
  await db.order.updateMany({
    where: {
      id: orderId,
      restaurantId,
      paid: false,
      status: { not: OrderStatus.CANCELADO },
    },
    data: {
      capacityQueuedAt: queuedAt,
      capacityAdmittedAt: null,
      status: OrderStatus.PENDENTE,
      preparationStartedAt: null,
    },
  });
  return true;
}

// Mantido para compatibilidade com testes e chamadas antigas. Novos pedidos não
// usam mais a exceção: excedentes são persistidos e entram na fila de capacidade.
export function assertOrderCapacity(activeOrders: number, configuredLimit: unknown) {
  const limit = normalizeOrderCapacityLimit(configuredLimit);
  if (activeOrders >= limit) return false;
  return limit;
}
