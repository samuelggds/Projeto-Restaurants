import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { onlinePaymentExpiresAt } from '../../payments/domain/onlinePaymentPolicy.js';
import { ActiveOnlinePaymentError } from '../domain/ActiveOnlinePaymentError.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

type GuardInput = {
  db: Prisma.TransactionClient;
  restaurantId: number;
  type: OrderType;
  userId: number | null;
  tableSessionId?: number | null;
  participantId?: number | null;
  now?: Date;
};

const ONLINE_PAYMENT_WINDOW_MS = 30 * 60 * 1000;

export async function assertNoActiveOnlinePayment({
  db,
  restaurantId,
  type,
  userId,
  tableSessionId,
  participantId,
  now = new Date(),
}: GuardInput) {
  const cutoff = new Date(now.getTime() - ONLINE_PAYMENT_WINDOW_MS);

  const scope =
    type === OrderType.MESA
      ? await lockTableParticipant({
          db,
          restaurantId,
          tableSessionId,
          participantId,
        })
      : await lockCustomer({
          db,
          userId,
        });

  const active = await db.order.findFirst({
    where: {
      restaurantId,
      paid: false,
      payOnDelivery: false,
      status: { not: OrderStatus.CANCELADO },
      ...scope,
      OR: [
        {
          paymentMethod: PaymentMethod.PIX,
          OR: [
            { pixExpiresAt: { gt: now } },
            {
              pixExpiresAt: null,
              createdAt: { gt: cutoff },
            },
          ],
        },
        {
          paymentMethod: PaymentMethod.CARTAO,
          createdAt: { gt: cutoff },
        },
      ],
    },
    select: {
      id: true,
      publicId: true,
      paymentMethod: true,
      type: true,
      pixExpiresAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });

  if (!active || !active.paymentMethod) return;

  const expiresAt =
    active.paymentMethod === PaymentMethod.PIX && active.pixExpiresAt
      ? active.pixExpiresAt
      : onlinePaymentExpiresAt(active.createdAt);

  if (expiresAt.getTime() <= now.getTime()) return;

  throw new ActiveOnlinePaymentError({
    orderId: active.id,
    orderPublicId: active.publicId,
    paymentMethod: active.paymentMethod,
    orderType: active.type,
    expiresAt: expiresAt.toISOString(),
  });
}

async function lockCustomer({
  db,
  userId,
}: {
  db: Prisma.TransactionClient;
  userId: number | null;
}) {
  if (!Number.isInteger(userId) || Number(userId) <= 0) {
    throw new OrderRequestError('Cliente inválido para iniciar pagamento online.');
  }

  const locked = await db.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "User"
    WHERE "id" = ${Number(userId)}
    FOR UPDATE
  `;
  if (!locked.length) {
    throw new OrderRequestError('Cliente não encontrado para iniciar pagamento online.');
  }

  return {
    userId: Number(userId),
    type: { not: OrderType.MESA },
  } satisfies Prisma.OrderWhereInput;
}

async function lockTableParticipant({
  db,
  restaurantId,
  tableSessionId,
  participantId,
}: {
  db: Prisma.TransactionClient;
  restaurantId: number;
  tableSessionId?: number | null;
  participantId?: number | null;
}) {
  const normalizedSessionId = Number(tableSessionId || 0);
  const normalizedParticipantId = Number(participantId || 0);
  if (
    !Number.isInteger(normalizedSessionId) ||
    normalizedSessionId <= 0 ||
    !Number.isInteger(normalizedParticipantId) ||
    normalizedParticipantId <= 0
  ) {
    throw new OrderRequestError('Participante da mesa inválido para iniciar pagamento online.');
  }

  const locked = await db.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "TableParticipant"
    WHERE "id" = ${normalizedParticipantId}
      AND "restaurantId" = ${restaurantId}
      AND "tableSessionId" = ${normalizedSessionId}
    FOR UPDATE
  `;
  if (!locked.length) {
    throw new OrderRequestError('Participante da mesa não encontrado para iniciar pagamento online.');
  }

  return {
    type: OrderType.MESA,
    tableSessionId: normalizedSessionId,
    participantId: normalizedParticipantId,
  } satisfies Prisma.OrderWhereInput;
}
