import { EmployeeSettlementPaymentStatus, UserRole, type Prisma } from '@prisma/client';

export type EmployeeCompensationDb = Prisma.TransactionClient;

class EmployeeCompensationRepository {
  async lockEmployee(db: EmployeeCompensationDb, restaurantId: number, employeeId: number) {
    await db.$queryRaw<Array<{ lockAcquired: number }>>`
      SELECT 1::int AS "lockAcquired"
      FROM pg_advisory_xact_lock(${restaurantId}::int, ${employeeId}::int)
    `;
  }

  async lockTableSession(db: EmployeeCompensationDb, restaurantId: number, tableSessionId: number) {
    await db.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "TableSession"
      WHERE "restaurantId" = ${restaurantId} AND "id" = ${tableSessionId}
      FOR UPDATE
    `;
  }

  async lockSettlement(db: EmployeeCompensationDb, restaurantId: number, settlementId: number) {
    const rows = await db.$queryRaw<Array<{ id: number }>>`
      SELECT "id"
      FROM "EmployeeSettlement"
      WHERE "restaurantId" = ${restaurantId} AND "id" = ${settlementId}
      FOR UPDATE
    `;
    if (!rows.length) throw new Error('Acerto não encontrado.');
  }

  async findEmployee(
    db: EmployeeCompensationDb,
    restaurantId: number,
    employeeId: number,
    requireActive = false,
  ) {
    const employee = await db.user.findFirst({
      where: {
        id: employeeId,
        restaurantId,
        role: UserRole.FUNCIONARIO,
        ...(requireActive ? { active: true } : {}),
      },
      select: { id: true, name: true, email: true, role: true, subRole: true, active: true },
    });
    if (!employee) {
      throw new Error(
        requireActive
          ? 'Funcionário ativo não encontrado neste restaurante.'
          : 'Funcionário não encontrado neste restaurante.',
      );
    }
    return employee;
  }

  async findEffectivePolicy(
    db: EmployeeCompensationDb,
    restaurantId: number,
    employeeId: number,
    at: Date,
  ) {
    return db.employeeCompensationPolicy.findFirst({
      where: {
        restaurantId,
        employeeId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: at } }],
      },
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
    });
  }

  async listPoliciesOverlapping(
    db: EmployeeCompensationDb,
    restaurantId: number,
    employeeId: number,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return db.employeeCompensationPolicy.findMany({
      where: {
        restaurantId,
        employeeId,
        effectiveFrom: { lt: periodEnd },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: periodStart } }],
      },
      orderBy: [{ effectiveFrom: 'asc' }, { version: 'asc' }],
    });
  }

  async getTimeZone(db: EmployeeCompensationDb, restaurantId: number) {
    const [tableAccountSettings, restaurantSettings] = await Promise.all([
      db.tableAccountSettings.findUnique({
        where: { restaurantId },
        select: { timeZone: true },
      }),
      db.restaurantSettings.findUnique({
        where: { restaurantId },
        select: { timezone: true },
      }),
    ]);
    return tableAccountSettings?.timeZone || restaurantSettings?.timezone || 'America/Sao_Paulo';
  }

  async activePaymentTotal(db: EmployeeCompensationDb, restaurantId: number, settlementId: number) {
    const payments = await db.employeeSettlementPayment.findMany({
      where: { restaurantId, settlementId, status: EmployeeSettlementPaymentStatus.ACTIVE },
      select: { amountCents: true },
    });
    return payments.reduce((total, payment) => total + payment.amountCents, 0n);
  }
}

export default new EmployeeCompensationRepository();
