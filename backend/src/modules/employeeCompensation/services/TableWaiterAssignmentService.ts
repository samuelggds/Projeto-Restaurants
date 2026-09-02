import { FuncionarioSubRole, TableSessionStatus, UserRole, type Prisma } from '@prisma/client';

import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import repository from '../repositories/EmployeeCompensationRepository.js';
import {
  auditEmployeeCompensation,
  isUniqueConflict,
  normalizeId,
  requireAdmin,
  requireReason,
  type CompensationActor,
} from './employeeCompensationSupport.js';

type AssignmentDb = Prisma.TransactionClient;

class TableWaiterAssignmentService {
  async get(input: { restaurantId: unknown; tableSessionId: unknown }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const tableSessionId = normalizeId(input.tableSessionId, 'Sessão da mesa');
    return withTenantDbContext(restaurantId, async (db) => {
      const session = await db.tableSession.findFirst({
        where: { id: tableSessionId, restaurantId },
        select: { id: true, publicId: true, status: true },
      });
      if (!session) throw new Error('Sessão da mesa não encontrada.');
      const history = await db.tableWaiterAssignment.findMany({
        where: { restaurantId, tableSessionId },
        include: { waiter: { select: { id: true, name: true, active: true, subRole: true } } },
        orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
      });
      return { session, current: history.find((entry) => !entry.unassignedAt) || null, history };
    });
  }

  async assign(input: {
    restaurantId: unknown;
    tableSessionId: unknown;
    waiterId: unknown;
    reason?: unknown;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const tableSessionId = normalizeId(input.tableSessionId, 'Sessão da mesa');
    const waiterId = normalizeId(input.waiterId, 'Garçom');
    return withTenantDbContext(restaurantId, (db) =>
      this.assignInTransaction({
        db,
        restaurantId,
        tableSessionId,
        waiterId,
        reason: input.reason,
        actor: input.actor,
      }),
    );
  }

  async autoAssignOpenedByWaiter(input: {
    db: AssignmentDb;
    restaurantId: number;
    tableSessionId: number;
    openedById: number;
  }) {
    await setTenantDbContext(input.db, input.restaurantId);
    const opener = await input.db.user.findFirst({
      where: {
        id: input.openedById,
        restaurantId: input.restaurantId,
        role: UserRole.FUNCIONARIO,
        subRole: FuncionarioSubRole.GARCOM,
        active: true,
      },
      select: { id: true },
    });
    if (!opener) return null;
    return this.assignInTransaction({
      ...input,
      waiterId: opener.id,
      reason: 'AUTO_ASSIGN_ON_OPEN',
      actor: { userId: opener.id, role: UserRole.FUNCIONARIO },
    });
  }

  async assignInTransaction(input: {
    db: AssignmentDb;
    restaurantId: number;
    tableSessionId: number;
    waiterId: number;
    reason?: unknown;
    actor: CompensationActor;
  }) {
    await repository.lockTableSession(input.db, input.restaurantId, input.tableSessionId);
    await repository.lockEmployee(input.db, input.restaurantId, input.waiterId);
    const [session, waiter] = await Promise.all([
      input.db.tableSession.findFirst({
        where: { id: input.tableSessionId, restaurantId: input.restaurantId },
        select: { id: true, publicId: true, status: true },
      }),
      input.db.user.findFirst({
        where: {
          id: input.waiterId,
          restaurantId: input.restaurantId,
          role: UserRole.FUNCIONARIO,
          subRole: FuncionarioSubRole.GARCOM,
          active: true,
        },
        select: { id: true, name: true },
      }),
    ]);
    if (!session) throw new Error('Sessão da mesa não encontrada.');
    if (
      session.status !== TableSessionStatus.OPEN &&
      session.status !== TableSessionStatus.CLOSING_REQUESTED
    ) {
      throw new Error('A responsabilidade só pode ser alterada enquanto a mesa estiver aberta.');
    }
    if (!waiter) throw new Error('Garçom ativo não encontrado neste restaurante.');

    const current = await input.db.tableWaiterAssignment.findFirst({
      where: {
        restaurantId: input.restaurantId,
        tableSessionId: input.tableSessionId,
        unassignedAt: null,
      },
      orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
    });
    if (current?.waiterId === input.waiterId) return current;
    const transferReason = current
      ? requireReason(input.reason, 'Motivo da transferência')
      : String(input.reason || 'MANUAL_ASSIGNMENT').trim();
    const assignedAt = new Date();
    if (current) {
      const closed = await input.db.tableWaiterAssignment.updateMany({
        where: { id: current.id, restaurantId: input.restaurantId, unassignedAt: null },
        data: { unassignedAt: assignedAt },
      });
      if (closed.count !== 1) throw new Error('A mesa foi transferida por outra sessão.');
    }

    try {
      const assignment = await input.db.tableWaiterAssignment.create({
        data: {
          restaurantId: input.restaurantId,
          tableSessionId: input.tableSessionId,
          waiterId: input.waiterId,
          assignedAt,
          assignedById: input.actor.userId,
          reason: transferReason,
        },
      });
      await auditEmployeeCompensation(input.db, {
        ...input.actor,
        restaurantId: input.restaurantId,
        action: current ? 'TABLE_WAITER_TRANSFERRED' : 'TABLE_WAITER_ASSIGNED',
        resource: `TableWaiterAssignment:${assignment.publicId}`,
        metadata: {
          assignmentPublicId: assignment.publicId,
          tableSessionPublicId: session.publicId,
          previousAssignmentPublicId: current?.publicId || null,
          previousWaiterId: current?.waiterId || null,
          waiterId: input.waiterId,
          reason: transferReason,
        },
      });
      return assignment;
    } catch (error) {
      if (isUniqueConflict(error)) throw new Error('A mesa foi atribuída por outra sessão.');
      throw error;
    }
  }
}

export default new TableWaiterAssignmentService();
