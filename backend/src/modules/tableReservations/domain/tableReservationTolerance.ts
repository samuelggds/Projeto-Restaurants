import type { Prisma } from '@prisma/client';

export const EARLY_CHECK_IN_MINUTES = 30;
const MILLIS_PER_MINUTE = 60_000;

export function normalizeReservationTolerance(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 60) {
    throw new RangeError('A tolerância da reserva deve estar entre 0 e 60 minutos.');
  }
  return value;
}

/** O fim da reserva nunca pode ser ultrapassado, mesmo com tolerância configurada. */
export function reservationCheckInDeadline(
  startsAt: Date,
  endsAt: Date,
  toleranceMinutes: number,
): Date {
  const minutes = normalizeReservationTolerance(toleranceMinutes);
  return new Date(Math.min(endsAt.getTime(), startsAt.getTime() + minutes * MILLIS_PER_MINUTE));
}

export function reservationCanCheckIn(
  startsAt: Date,
  endsAt: Date,
  toleranceMinutes: number,
  now: Date = new Date(),
): boolean {
  return (
    now.getTime() >= startsAt.getTime() - EARLY_CHECK_IN_MINUTES * MILLIS_PER_MINUTE &&
    now.getTime() <= reservationCheckInDeadline(startsAt, endsAt, toleranceMinutes).getTime()
  );
}

/**
 * Comparações estritas: o último instante permitido ainda aceita check-in.
 * Apenas reservas CONFIRMED sem sessão/check-in entram na expiração.
 */
export function overdueReservationsWhere(
  restaurantId: number,
  toleranceMinutes: number,
  now: Date = new Date(),
): Prisma.TableReservationWhereInput {
  const minutes = normalizeReservationTolerance(toleranceMinutes);
  if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
    throw new TypeError('Restaurante inválido para expiração de reservas.');
  }
  return {
    restaurantId,
    status: 'CONFIRMED',
    checkedInAt: null,
    tableSessionId: null,
    OR: [
      { startsAt: { lt: new Date(now.getTime() - minutes * MILLIS_PER_MINUTE) } },
      { endsAt: { lt: now } },
    ],
  };
}

export async function expireNoShowReservations(
  tx: Prisma.TransactionClient,
  restaurantId: number,
  toleranceMinutes: number,
  now: Date = new Date(),
  tableId?: number,
) {
  return tx.tableReservation.updateMany({
    where: {
      ...overdueReservationsWhere(restaurantId, toleranceMinutes, now),
      ...(tableId === undefined ? {} : { tableId }),
    },
    data: { status: 'NO_SHOW' },
  });
}
