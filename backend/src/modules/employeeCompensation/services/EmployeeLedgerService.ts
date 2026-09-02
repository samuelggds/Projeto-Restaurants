import {
  EmployeeEarningDirection,
  EmployeeEarningSourceType,
  EmployeeEarningType,
  UserRole,
} from '@prisma/client';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  assertMoneyCents,
  earningDirectionForAdjustment,
} from '../domain/employeeCompensationRules.js';
import repository from '../repositories/EmployeeCompensationRepository.js';
import {
  auditEmployeeCompensation,
  isUniqueConflict,
  normalizeId,
  requireAdmin,
  requireReason,
  serializeFinancial,
  sha256,
  type CompensationActor,
} from './employeeCompensationSupport.js';

export type ManualAdjustmentType = 'BONUS' | 'DEDUCTION' | 'ADVANCE' | 'CORRECTION';

class EmployeeLedgerService {
  async listAdmin(input: {
    restaurantId: unknown;
    employeeId?: unknown;
    from?: Date;
    until?: Date;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = input.employeeId ? normalizeId(input.employeeId, 'Funcionário') : undefined;
    return withTenantDbContext(restaurantId, async (db) =>
      serializeFinancial(
        await db.employeeEarning.findMany({
          where: {
            restaurantId,
            ...(employeeId ? { employeeId } : {}),
            ...(input.from || input.until
              ? {
                  occurredAt: {
                    ...(input.from ? { gte: input.from } : {}),
                    ...(input.until ? { lt: input.until } : {}),
                  },
                }
              : {}),
          },
          include: {
            employee: { select: { id: true, name: true, subRole: true, active: true } },
            settlementItems: {
              where: { active: true },
              include: { settlement: { select: { publicId: true, status: true } } },
            },
          },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: 500,
        }),
      ),
    );
  }

  async listOwn(input: { restaurantId: unknown; actor: CompensationActor }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    if (input.actor.role !== UserRole.FUNCIONARIO) {
      throw new Error('Esta consulta é exclusiva do próprio funcionário.');
    }
    return withTenantDbContext(restaurantId, async (db) => {
      await repository.findEmployee(db, restaurantId, input.actor.userId);
      return serializeFinancial(
        await db.employeeEarning.findMany({
          where: { restaurantId, employeeId: input.actor.userId },
          include: {
            settlementItems: {
              where: { active: true },
              include: { settlement: { select: { publicId: true, status: true } } },
            },
          },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          take: 500,
        }),
      );
    });
  }

  async createAdjustment(input: {
    restaurantId: unknown;
    employeeId: unknown;
    type: ManualAdjustmentType;
    direction?: EmployeeEarningDirection;
    amountCents: unknown;
    reason: unknown;
    occurredAt?: Date;
    idempotencyKey: string;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = normalizeId(input.employeeId, 'Funcionário');
    const amountCents = assertMoneyCents(input.amountCents, 'Valor do ajuste', false);
    const reason = requireReason(input.reason);
    const direction = earningDirectionForAdjustment(input.type, input.direction);
    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    if (Number.isNaN(occurredAt.getTime())) throw new Error('Data do ajuste inválida.');
    const normalizedKey = String(input.idempotencyKey || '').trim();
    if (normalizedKey.length < 8 || normalizedKey.length > 200) {
      throw new Error('Idempotency-Key deve ter entre 8 e 200 caracteres.');
    }
    const idempotencyKeyHash = sha256(normalizedKey);
    const requestFingerprint = sha256(
      JSON.stringify({
        employeeId,
        type: input.type,
        direction,
        amountCents: amountCents.toString(),
        reason,
        occurredAt: occurredAt.toISOString(),
      }),
    );

    return withTenantDbContext(restaurantId, async (db) => {
      await repository.findEmployee(db, restaurantId, employeeId);
      const existing = await db.employeeEarning.findFirst({
        where: { restaurantId, idempotencyKeyHash },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new Error('Idempotency-Key já foi usada com outro ajuste.');
        }
        return serializeFinancial(existing);
      }

      try {
        const earning = await db.employeeEarning.create({
          data: {
            restaurantId,
            employeeId,
            type: EmployeeEarningType[input.type],
            direction,
            amountCents,
            sourceType: EmployeeEarningSourceType.MANUAL_ADJUSTMENT,
            sourceId: idempotencyKeyHash,
            idempotencyKeyHash,
            requestFingerprint,
            snapshot: {
              adjustmentType: input.type,
              direction,
              amountCents: amountCents.toString(),
              reason,
            },
            occurredAt,
            createdById: input.actor.userId,
          },
        });
        await auditEmployeeCompensation(db, {
          ...input.actor,
          restaurantId,
          action: 'EMPLOYEE_EARNING_ADJUSTMENT_CREATED',
          resource: `EmployeeEarning:${earning.publicId}`,
          metadata: {
            earningPublicId: earning.publicId,
            employeeId,
            type: earning.type,
            direction,
            amountCents: amountCents.toString(),
            reason,
          },
        });
        return serializeFinancial(earning);
      } catch (error) {
        if (isUniqueConflict(error)) {
          throw new Error('O ajuste já foi registrado por outra sessão.');
        }
        throw error;
      }
    });
  }
}

export default new EmployeeLedgerService();
