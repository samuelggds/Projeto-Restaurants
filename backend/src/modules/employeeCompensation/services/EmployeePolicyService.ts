import type {
  EmployeeCompensationBaseModel,
  EmployeeCompensationProrationMode,
  EmployeeCompensationVariableModel,
} from '@prisma/client';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  assertMoneyCents,
  validatePolicyForEmployee,
} from '../domain/employeeCompensationRules.js';
import repository from '../repositories/EmployeeCompensationRepository.js';
import {
  auditEmployeeCompensation,
  isUniqueConflict,
  normalizeId,
  requireAdmin,
  serializeFinancial,
  type CompensationActor,
} from './employeeCompensationSupport.js';

export type CompensationPolicyInput = {
  baseModel: EmployeeCompensationBaseModel;
  fixedMonthlyCents?: unknown;
  hourlyRateCents?: unknown;
  variableModel: EmployeeCompensationVariableModel;
  variableBasisPoints?: number | null;
  fixedPerTableCents?: unknown;
  prorationMode: EmployeeCompensationProrationMode;
  effectiveFrom: Date;
  effectiveUntil?: Date | null;
};

function validDate(value: Date, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} inválida.`);
  return date;
}

class EmployeePolicyService {
  async list(input: { restaurantId: unknown; employeeId?: unknown }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = input.employeeId ? normalizeId(input.employeeId, 'Funcionário') : undefined;
    return withTenantDbContext(restaurantId, async (db) =>
      serializeFinancial(
        await db.employeeCompensationPolicy.findMany({
          where: { restaurantId, ...(employeeId ? { employeeId } : {}) },
          include: {
            employee: {
              select: { id: true, name: true, subRole: true, active: true },
            },
          },
          orderBy: [{ employeeId: 'asc' }, { version: 'desc' }],
        }),
      ),
    );
  }

  async getForEmployee(input: { restaurantId: unknown; employeeId: unknown }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = normalizeId(input.employeeId, 'Funcionário');
    return withTenantDbContext(restaurantId, async (db) => {
      await repository.findEmployee(db, restaurantId, employeeId);
      return serializeFinancial(
        await db.employeeCompensationPolicy.findMany({
          where: { restaurantId, employeeId },
          orderBy: { version: 'desc' },
        }),
      );
    });
  }

  async createVersion(input: {
    restaurantId: unknown;
    employeeId: unknown;
    actor: CompensationActor;
    policy: CompensationPolicyInput;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = normalizeId(input.employeeId, 'Funcionário');
    const effectiveFrom = validDate(input.policy.effectiveFrom, 'Vigência inicial');
    const effectiveUntil = input.policy.effectiveUntil
      ? validDate(input.policy.effectiveUntil, 'Vigência final')
      : null;
    if (effectiveUntil && effectiveUntil <= effectiveFrom) {
      throw new Error('A vigência final deve ser posterior à inicial.');
    }

    const fixedMonthlyCents =
      input.policy.fixedMonthlyCents === undefined || input.policy.fixedMonthlyCents === null
        ? null
        : assertMoneyCents(input.policy.fixedMonthlyCents, 'Valor mensal');
    const hourlyRateCents =
      input.policy.hourlyRateCents === undefined || input.policy.hourlyRateCents === null
        ? null
        : assertMoneyCents(input.policy.hourlyRateCents, 'Valor por hora');
    const fixedPerTableCents =
      input.policy.fixedPerTableCents === undefined || input.policy.fixedPerTableCents === null
        ? null
        : assertMoneyCents(input.policy.fixedPerTableCents, 'Valor por mesa', false);
    const variableBasisPoints = input.policy.variableBasisPoints ?? null;

    return withTenantDbContext(restaurantId, async (db) => {
      const employee = await repository.findEmployee(db, restaurantId, employeeId, true);
      validatePolicyForEmployee({
        subRole: employee.subRole,
        baseModel: input.policy.baseModel,
        fixedMonthlyCents,
        hourlyRateCents,
        variableModel: input.policy.variableModel,
        variableBasisPoints,
        fixedPerTableCents,
        prorationMode: input.policy.prorationMode,
      });
      await repository.lockEmployee(db, restaurantId, employeeId);

      const current = await db.employeeCompensationPolicy.findFirst({
        where: { restaurantId, employeeId, active: true },
        orderBy: { version: 'desc' },
      });
      if (current && effectiveFrom <= current.effectiveFrom) {
        throw new Error('A nova versão deve iniciar depois da versão vigente.');
      }
      if (current) {
        const affectedEarnings = await db.employeeEarning.count({
          where: { restaurantId, policyId: current.id, occurredAt: { gte: effectiveFrom } },
        });
        if (affectedEarnings > 0) {
          throw new Error(
            'A nova vigência alcança ganhos já lançados; use uma data posterior para preservar o histórico.',
          );
        }
        const closed = await db.employeeCompensationPolicy.updateMany({
          where: { id: current.id, restaurantId, active: true },
          data: { active: false, effectiveUntil: effectiveFrom },
        });
        if (closed.count !== 1) {
          throw new Error('A política foi alterada por outra sessão.');
        }
      }

      const version =
        (
          await db.employeeCompensationPolicy.aggregate({
            where: { restaurantId, employeeId },
            _max: { version: true },
          })
        )._max.version || 0;
      try {
        const created = await db.employeeCompensationPolicy.create({
          data: {
            restaurantId,
            employeeId,
            baseModel: input.policy.baseModel,
            fixedMonthlyCents,
            hourlyRateCents,
            variableModel: input.policy.variableModel,
            variableBasisPoints,
            fixedPerTableCents,
            prorationMode: input.policy.prorationMode,
            effectiveFrom,
            effectiveUntil,
            version: version + 1,
            active: true,
            createdById: input.actor.userId,
          },
        });
        await auditEmployeeCompensation(db, {
          ...input.actor,
          restaurantId,
          action: current
            ? 'EMPLOYEE_COMPENSATION_POLICY_UPDATED'
            : 'EMPLOYEE_COMPENSATION_POLICY_CREATED',
          resource: `EmployeeCompensationPolicy:${created.publicId}`,
          metadata: {
            employeeId,
            policyPublicId: created.publicId,
            version: created.version,
            baseModel: created.baseModel,
            variableModel: created.variableModel,
            fixedMonthlyCents: created.fixedMonthlyCents?.toString() || null,
            hourlyRateCents: created.hourlyRateCents?.toString() || null,
            variableBasisPoints: created.variableBasisPoints,
            fixedPerTableCents: created.fixedPerTableCents?.toString() || null,
          },
        });
        return serializeFinancial(created);
      } catch (error) {
        if (isUniqueConflict(error)) {
          throw new Error('A política foi alterada por outra sessão.');
        }
        throw error;
      }
    });
  }

  async close(input: {
    restaurantId: unknown;
    publicId: string;
    effectiveUntil?: Date;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const effectiveUntil = input.effectiveUntil
      ? validDate(input.effectiveUntil, 'Vigência final')
      : new Date();
    return withTenantDbContext(restaurantId, async (db) => {
      const policy = await db.employeeCompensationPolicy.findFirst({
        where: { restaurantId, publicId: input.publicId },
      });
      if (!policy) throw new Error('Política não encontrada.');
      if (!policy.active) return serializeFinancial(policy);
      if (effectiveUntil <= policy.effectiveFrom) {
        throw new Error('A vigência final deve ser posterior à inicial.');
      }
      await repository.lockEmployee(db, restaurantId, policy.employeeId);
      const changed = await db.employeeCompensationPolicy.updateMany({
        where: { id: policy.id, restaurantId, active: true },
        data: { active: false, effectiveUntil },
      });
      if (changed.count !== 1) throw new Error('A política foi alterada por outra sessão.');
      const closed = await db.employeeCompensationPolicy.findUniqueOrThrow({
        where: { id_restaurantId: { id: policy.id, restaurantId } },
      });
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_COMPENSATION_POLICY_CLOSED',
        resource: `EmployeeCompensationPolicy:${closed.publicId}`,
        metadata: {
          policyPublicId: closed.publicId,
          employeeId: closed.employeeId,
          version: closed.version,
          effectiveUntil: effectiveUntil.toISOString(),
        },
      });
      return serializeFinancial(closed);
    });
  }
}

export default new EmployeePolicyService();
