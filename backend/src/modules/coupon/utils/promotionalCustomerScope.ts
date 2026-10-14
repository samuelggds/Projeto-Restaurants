import type { Prisma } from '@prisma/client';

/** Guests at a table have a scoped participant identity, not a shared NULL userId. */
export function promotionalCustomerScope({
  restaurantId,
  couponId,
  userId,
  participantId,
  tableSessionId,
}: {
  restaurantId: number;
  couponId: number;
  userId: number | null;
  participantId: number | null;
  tableSessionId: number | null;
}): Prisma.OrderWhereInput {
  if (userId !== null && Number.isSafeInteger(userId) && userId > 0) {
    return { restaurantId, couponId, userId };
  }
  if (
    !Number.isSafeInteger(participantId) || !participantId ||
    !Number.isSafeInteger(tableSessionId) || !tableSessionId
  ) {
    throw new Error('É necessária a identificação do cliente para aplicar este cupom.');
  }
  return { restaurantId, couponId, participantId, tableSessionId };
}
