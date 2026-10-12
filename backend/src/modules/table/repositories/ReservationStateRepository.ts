import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

/** Only a tenant-scoped table ID projection; no guest identity, contact or notes. */
class ReservationStateRepository {
  async findReservedTableIds(restaurantId: number, db: typeof prisma = prisma) {
    const rows = await db.$transaction(async (tx) => {
      await setTenantDbContext(tx, restaurantId);
      return tx.tableReservation.findMany({
        where: { restaurantId, status: 'CONFIRMED', endsAt: { gt: new Date() } },
        select: { tableId: true },
        distinct: ['tableId'],
      });
    });
    return new Set(rows.map((row) => row.tableId));
  }
}

export default new ReservationStateRepository();
