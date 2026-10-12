import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { overdueReservationsWhere } from '../domain/tableReservationTolerance.js';
import { tableReservationEvents } from '../realtime/tableReservationEvents.js';

const TENANTS_PER_PAGE = 100;
const RESERVATIONS_PER_BATCH = 200;
const BATCHES_PER_TENANT = 5;

/**
 * Distributed-lease scheduled by the API runtime, which owns the realtime publisher.
 * Every mutation runs in its own transaction with tenant RLS set transaction-locally.
 */
export class TableReservationNoShowExpirationJob {
  async execute(now = new Date()) {
    let cursor = 0;
    let affected = 0;
    let tenantsVisited = 0;
    const failures: Error[] = [];

    while (true) {
      const tenants = await prisma.restaurantSettings.findMany({
        where: { tableReservationsEnabled: true, restaurantId: { gt: cursor } },
        select: { restaurantId: true },
        orderBy: { restaurantId: 'asc' },
        take: TENANTS_PER_PAGE,
      });
      if (tenants.length === 0) break;

      for (const tenant of tenants) {
        cursor = tenant.restaurantId;
        tenantsVisited += 1;
        let changedForTenant = 0;
        try {
          for (let iteration = 0; iteration < BATCHES_PER_TENANT; iteration += 1) {
            const count = await prisma.$transaction(async (tx) => {
              await setTenantDbContext(tx, tenant.restaurantId);
              // Re-read settings inside the RLS transaction to honor changes made meanwhile.
              const settings = await tx.restaurantSettings.findUnique({
                where: { restaurantId: tenant.restaurantId },
                select: {
                  tableReservationsEnabled: true,
                  tableReservationToleranceMinutes: true,
                },
              });
              if (!settings?.tableReservationsEnabled) return 0;
              const where = overdueReservationsWhere(
                tenant.restaurantId,
                settings.tableReservationToleranceMinutes,
                now,
              );
              const candidates = await tx.tableReservation.findMany({
                where,
                select: { id: true },
                orderBy: { id: 'asc' },
                take: RESERVATIONS_PER_BATCH,
              });
              if (candidates.length === 0) return 0;
              const updated = await tx.tableReservation.updateMany({
                where: { ...where, id: { in: candidates.map((row) => row.id) } },
                data: { status: 'NO_SHOW' },
              });
              return updated.count;
            });
            changedForTenant += count;
            if (count === 0) break;
          }
          affected += changedForTenant;
        } catch (error) {
          failures.push(new Error('Tenant reservation expiration failed.', { cause: error }));
          console.error('[TABLE_RESERVATION_NO_SHOW_ERROR]', {
            restaurantId: tenant.restaurantId,
            name: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          });
        }
        if (changedForTenant > 0) {
          try {
            tableReservationEvents.changed(tenant.restaurantId);
          } catch {
            console.warn('[TABLE_RESERVATION_INVALIDATION_FAILED]');
          }
        }
      }
      if (tenants.length < TENANTS_PER_PAGE) break;
    }

    if (failures.length > 0) {
      throw new AggregateError(failures, 'Table reservation expiration completed with failures.');
    }
    return { tenantsVisited, markedNoShow: affected };
  }
}

export default new TableReservationNoShowExpirationJob();
