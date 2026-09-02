import {
  EmployeeCompensationVariableModel,
  FuncionarioSubRole,
  TableSessionStatus,
  type Prisma,
} from '@prisma/client';

import {
  auditEmployeeCompensation,
  type CompensationActor,
} from './employeeCompensationSupport.js';
import repository from '../repositories/EmployeeCompensationRepository.js';

export async function prepareEmployeeCompensationAccessChange(input: {
  db: Prisma.TransactionClient;
  restaurantId: number;
  employee: { id: number; subRole: FuncionarioSubRole | null };
  mode: 'LEAVE_WAITER' | 'LEAVE_EMPLOYEE' | 'DEACTIVATE';
  actor: CompensationActor;
}) {
  await repository.lockEmployee(input.db, input.restaurantId, input.employee.id);

  if (input.employee.subRole === FuncionarioSubRole.GARCOM) {
    const openAssignment = await input.db.tableWaiterAssignment.findFirst({
      where: {
        restaurantId: input.restaurantId,
        waiterId: input.employee.id,
        unassignedAt: null,
        tableSession: {
          status: { in: [TableSessionStatus.OPEN, TableSessionStatus.CLOSING_REQUESTED] },
        },
      },
      include: { tableSession: { select: { publicId: true } } },
    });
    if (openAssignment) {
      throw new Error(
        `Transfira a mesa ${openAssignment.tableSession.publicId} antes de alterar ou desativar este garçom.`,
      );
    }
  }

  const current = await input.db.employeeCompensationPolicy.findFirst({
    where: {
      restaurantId: input.restaurantId,
      employeeId: input.employee.id,
      active: true,
      ...(input.mode === 'LEAVE_WAITER'
        ? { variableModel: { not: EmployeeCompensationVariableModel.NONE } }
        : {}),
    },
    orderBy: { version: 'desc' },
  });
  if (!current) return;

  const now = new Date();
  const effectiveUntil =
    now > current.effectiveFrom ? now : new Date(current.effectiveFrom.getTime() + 1);
  const changed = await input.db.employeeCompensationPolicy.updateMany({
    where: { id: current.id, restaurantId: input.restaurantId, active: true },
    data: { active: false, effectiveUntil },
  });
  if (changed.count !== 1) throw new Error('A política foi alterada por outra sessão.');

  let replacementPublicId: string | null = null;
  if (input.mode === 'LEAVE_WAITER') {
    const replacement = await input.db.employeeCompensationPolicy.create({
      data: {
        restaurantId: input.restaurantId,
        employeeId: input.employee.id,
        baseModel: current.baseModel,
        fixedMonthlyCents: current.fixedMonthlyCents,
        hourlyRateCents: current.hourlyRateCents,
        variableModel: EmployeeCompensationVariableModel.NONE,
        variableBasisPoints: null,
        fixedPerTableCents: null,
        prorationMode: current.prorationMode,
        effectiveFrom: effectiveUntil,
        effectiveUntil: current.effectiveUntil,
        version: current.version + 1,
        active: true,
        createdById: input.actor.userId,
      },
    });
    replacementPublicId = replacement.publicId;
  }

  await auditEmployeeCompensation(input.db, {
    ...input.actor,
    restaurantId: input.restaurantId,
    action: 'EMPLOYEE_COMPENSATION_POLICY_CLOSED',
    resource: `EmployeeCompensationPolicy:${current.publicId}`,
    metadata: {
      policyPublicId: current.publicId,
      employeeId: input.employee.id,
      policyVersion: current.version,
      reason: input.mode,
      effectiveUntil: effectiveUntil.toISOString(),
      replacementPolicyPublicId: replacementPublicId,
    },
  });
}
