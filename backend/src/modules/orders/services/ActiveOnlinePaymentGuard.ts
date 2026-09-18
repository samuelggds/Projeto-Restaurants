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
          restaurantId,
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
  restaurantId,
  userId,
}: {
  db: Prisma.TransactionClient;
  restaurantId: number;
  userId: number | null;
}) {
  if (!Number.isInteger(userId) || Number(userId) <= 0) {
    throw new OrderRequestError('Cliente inválido para iniciar pagamento online.');
  }

  // O cliente já foi resolvido/validado nesta mesma transação. A trava
  // consultiva serializa somente checkouts concorrentes do mesmo cliente
  // neste restaurante, sem repetir uma busca de existência.
  await db.$queryRaw<Array<{ lockAcquired: number }>>`
    SELECT 1::int AS "lockAcquired"
    FROM pg_advisory_xact_lock(${restaurantId}::int, ${Number(userId)}::int)
  `;

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

  // O participante já foi validado por CreateOrderService nesta mesma
  // transação. Namespace negativo separa participantes de clientes e mantém
  // a trava restrita ao restaurante atual.
  await db.$queryRaw<Array<{ lockAcquired: number }>>`
    SELECT 1::int AS "lockAcquired"
    FROM pg_advisory_xact_lock(${-restaurantId}::int, ${normalizedParticipantId}::int)
  `;

  return {
    type: OrderType.MESA,
    tableSessionId: normalizedSessionId,
    participantId: normalizedParticipantId,
  } satisfies Prisma.OrderWhereInput;
}
