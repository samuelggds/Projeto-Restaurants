import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { overdueReservationsWhere } from '../../tableReservations/domain/tableReservationTolerance.js';

/** Only a tenant-scoped table ID projection; no guest identity, contact or notes. */
class ReservationStateRepository {
  async findReservedTableIds(restaurantId: number, db: typeof prisma = prisma) {
    const rows = await db.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      const now = new Date();
      const settings = await tx.restaurantSettings.findUnique({ where: { restaurantId }, select: { tableReservationToleranceMinutes: true } });
      const overdue = overdueReservationsWhere(restaurantId, settings?.tableReservationToleranceMinutes ?? 15, now);
      return tx.tableReservation.findMany({
        where: { restaurantId, status: 'CONFIRMED', endsAt: { gt: now }, NOT: overdue },
        select: { tableId: true },
        distinct: ['tableId'],
      });
    });
    return new Set(rows.map((row) => row.tableId));
  }
}

export default new ReservationStateRepository();
