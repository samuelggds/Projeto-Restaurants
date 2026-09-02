import {
  EmployeeEarningDirection,
  EmployeeEarningSourceType,
  EmployeeEarningType,
  EmployeeWorkEntryStatus,
} from '@prisma/client';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import repository from '../repositories/EmployeeCompensationRepository.js';
import {
  auditEmployeeCompensation,
  isUniqueConflict,
  normalizeId,
  requireAdmin,
  requireReason,
  serializeFinancial,
  type CompensationActor,
} from './employeeCompensationSupport.js';

function parseWorkDate(value: string | Date) {
  const dateKey = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(dateKey)) {
    throw new Error('Data de trabalho inválida.');
  }
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error('Data de trabalho inválida.');
  }
  return date;
}

class EmployeeWorkEntryService {
  async list(input: {
    restaurantId: unknown;
    employeeId?: unknown;
    status?: EmployeeWorkEntryStatus;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = input.employeeId ? normalizeId(input.employeeId, 'Funcionário') : undefined;
    return withTenantDbContext(restaurantId, async (db) =>
      serializeFinancial(
        await db.employeeWorkEntry.findMany({
          where: {
            restaurantId,
            ...(employeeId ? { employeeId } : {}),
            ...(input.status ? { status: input.status } : {}),
          },
          include: { employee: { select: { id: true, name: true, subRole: true, active: true } } },
          orderBy: [{ workDate: 'desc' }, { id: 'desc' }],
          take: 500,
        }),
      ),
    );
  }

  async create(input: {
    restaurantId: unknown;
    employeeId: unknown;
    workDate: string | Date;
    minutesWorked: number;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = normalizeId(input.employeeId, 'Funcionário');
    const workDate = parseWorkDate(input.workDate);
    if (
      !Number.isSafeInteger(input.minutesWorked) ||
      input.minutesWorked <= 0 ||
      input.minutesWorked > 1_440
    ) {
      throw new Error('Minutos trabalhados devem estar entre 1 e 1.440.');
    }
    return withTenantDbContext(restaurantId, async (db) => {
      await repository.findEmployee(db, restaurantId, employeeId, true);
      try {
        return serializeFinancial(
          await db.employeeWorkEntry.create({
            data: {
              restaurantId,
              employeeId,
              workDate,
              minutesWorked: input.minutesWorked,
              createdById: input.actor.userId,
            },
          }),
        );
      } catch (error) {
        if (isUniqueConflict(error)) {
          throw new Error('Já existe um lançamento de horas para este funcionário nesta data.');
        }
        throw error;
      }
    });
  }

  async approve(input: { restaurantId: unknown; publicId: string; actor: CompensationActor }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    return withTenantDbContext(restaurantId, async (db) => {
      const entry = await db.employeeWorkEntry.findFirst({
        where: { restaurantId, publicId: input.publicId },
      });
      if (!entry) throw new Error('Lançamento de horas não encontrado.');
      if (input.actor.userId === entry.employeeId) {
        throw new Error('Funcionário não pode aprovar as próprias horas.');
      }
      if (entry.status === EmployeeWorkEntryStatus.APPROVED) return serializeFinancial(entry);
      if (entry.status !== EmployeeWorkEntryStatus.DRAFT) {
        throw new Error('Somente horas em rascunho podem ser aprovadas.');
      }
      const now = new Date();
      const changed = await db.employeeWorkEntry.updateMany({
        where: {
          id: entry.id,
          restaurantId,
          status: EmployeeWorkEntryStatus.DRAFT,
          version: entry.version,
        },
        data: {
          status: EmployeeWorkEntryStatus.APPROVED,
          approvedById: input.actor.userId,
          approvedAt: now,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('As horas foram alteradas por outra sessão.');
      const approved = await db.employeeWorkEntry.findUniqueOrThrow({
        where: { id_restaurantId: { id: entry.id, restaurantId } },
      });
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_WORK_ENTRY_APPROVED',
        resource: `EmployeeWorkEntry:${approved.publicId}`,
        metadata: {
          workEntryPublicId: approved.publicId,
          employeeId: approved.employeeId,
          workDate: approved.workDate.toISOString().slice(0, 10),
          minutesWorked: approved.minutesWorked,
        },
      });
      return serializeFinancial(approved);
    });
  }

  async cancel(input: {
    restaurantId: unknown;
    publicId: string;
    reason: unknown;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const reason = requireReason(input.reason, 'Motivo do cancelamento');
    return withTenantDbContext(restaurantId, async (db) => {
      const entry = await db.employeeWorkEntry.findFirst({
        where: { restaurantId, publicId: input.publicId },
      });
      if (!entry) throw new Error('Lançamento de horas não encontrado.');
      if (entry.status === EmployeeWorkEntryStatus.CANCELED) return serializeFinancial(entry);
      const now = new Date();
      const changed = await db.employeeWorkEntry.updateMany({
        where: { id: entry.id, restaurantId, status: entry.status, version: entry.version },
        data: {
          status: EmployeeWorkEntryStatus.CANCELED,
          canceledById: input.actor.userId,
          canceledAt: now,
          cancelReason: reason,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('As horas foram alteradas por outra sessão.');

      const hourlyEarning = await db.employeeEarning.findFirst({
        where: {
          restaurantId,
          employeeId: entry.employeeId,
          sourceType: EmployeeEarningSourceType.WORK_ENTRY,
          sourceId: entry.publicId,
          type: EmployeeEarningType.HOURLY,
          direction: EmployeeEarningDirection.CREDIT,
        },
      });
      if (hourlyEarning) {
        await db.employeeEarning.upsert({
          where: {
            restaurantId_employeeId_sourceType_sourceId_type: {
              restaurantId,
              employeeId: entry.employeeId,
              sourceType: EmployeeEarningSourceType.WORK_ENTRY,
              sourceId: `${entry.publicId}:cancel`,
              type: EmployeeEarningType.CORRECTION,
            },
          },
          update: {},
          create: {
            restaurantId,
            employeeId: entry.employeeId,
            type: EmployeeEarningType.CORRECTION,
            direction: EmployeeEarningDirection.DEBIT,
            amountCents: hourlyEarning.amountCents,
            sourceType: EmployeeEarningSourceType.WORK_ENTRY,
            sourceId: `${entry.publicId}:cancel`,
            sourcePublicId: entry.publicId,
            reversesEarningId: hourlyEarning.id,
            snapshot: {
              reason,
              canceledWorkEntryPublicId: entry.publicId,
              reversedEarningPublicId: hourlyEarning.publicId,
              amountCents: hourlyEarning.amountCents.toString(),
            },
            occurredAt: now,
            createdById: input.actor.userId,
          },
        });
      }

      const canceled = await db.employeeWorkEntry.findUniqueOrThrow({
        where: { id_restaurantId: { id: entry.id, restaurantId } },
      });
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_WORK_ENTRY_CANCELED',
        resource: `EmployeeWorkEntry:${canceled.publicId}`,
        metadata: {
          workEntryPublicId: canceled.publicId,
          employeeId: canceled.employeeId,
          reason,
          reversedEarningPublicId: hourlyEarning?.publicId || null,
        },
      });
      return serializeFinancial(canceled);
    });
  }
}

export default new EmployeeWorkEntryService();
