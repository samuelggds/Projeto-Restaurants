import {
  EmployeeCompensationBaseModel,
  EmployeeCompensationProrationMode,
  EmployeeEarningDirection,
  EmployeeEarningSourceType,
  EmployeeEarningType,
  EmployeeSettlementPaymentStatus,
  EmployeeSettlementStatus,
  EmployeeWorkEntryStatus,
  UserRole,
  type EmployeeSettlementPaymentMethod,
  type Prisma,
} from '@prisma/client';

import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import {
  countActiveCalendarDays,
  getRestaurantMonthPeriod,
} from '../../courierCompensation/domain/restaurantTimePeriods.js';
import {
  assertMoneyCents,
  calculateHourlyCents,
  calculateMonthlyBaseCents,
  calculateSettlementTotals,
} from '../domain/employeeCompensationRules.js';
import repository, {
  type EmployeeCompensationDb,
} from '../repositories/EmployeeCompensationRepository.js';
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

type MonthPeriod = ReturnType<typeof getRestaurantMonthPeriod>;

const settlementInclude = {
  employee: { select: { id: true, name: true, subRole: true, active: true } },
  items: {
    where: { active: true },
    include: { earning: true },
    orderBy: { createdAt: 'asc' },
  },
  payments: { orderBy: { registeredAt: 'asc' } },
} satisfies Prisma.EmployeeSettlementInclude;

const ownPaymentSelect = {
  publicId: true,
  amountCents: true,
  method: true,
  reference: true,
  notes: true,
  status: true,
  registeredAt: true,
  reversedAt: true,
  reverseReason: true,
} satisfies Prisma.EmployeeSettlementPaymentSelect;

function referenceMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function workDateOccurrence(workDate: Date, period: MonthPeriod) {
  const day = workDate.getUTCDate();
  return new Date(period.gte.getTime() + (day - 1) * 86_400_000 + 12 * 60 * 60 * 1000);
}

async function ensureBaseEarning(
  db: EmployeeCompensationDb,
  restaurantId: number,
  employeeId: number,
  period: MonthPeriod,
) {
  const policies = await repository.listPoliciesOverlapping(
    db,
    restaurantId,
    employeeId,
    period.gte,
    period.lt,
  );
  const fixedPolicies = policies.filter(
    (policy) =>
      policy.baseModel === EmployeeCompensationBaseModel.FIXED_MONTHLY &&
      policy.fixedMonthlyCents !== null,
  );
  if (!fixedPolicies.length) return;

  const latest = fixedPolicies[fixedPolicies.length - 1];
  let amountCents: bigint;
  let segments: Array<Record<string, string | number | null>>;
  if (latest.prorationMode === EmployeeCompensationProrationMode.NONE) {
    amountCents = latest.fixedMonthlyCents || 0n;
    segments = [
      {
        policyPublicId: latest.publicId,
        policyVersion: latest.version,
        prorationMode: latest.prorationMode,
        activeCalendarDays: period.calendarDays,
        amountCents: amountCents.toString(),
      },
    ];
  } else {
    const calculated = fixedPolicies.map((policy) => {
      const activeCalendarDays = countActiveCalendarDays(
        policy.effectiveFrom,
        policy.effectiveUntil,
        period,
      );
      const segmentAmount = calculateMonthlyBaseCents(
        policy.fixedMonthlyCents || 0n,
        policy.prorationMode,
        activeCalendarDays,
        period.calendarDays,
      );
      return { policy, activeCalendarDays, segmentAmount };
    });
    amountCents = calculated.reduce((total, entry) => total + entry.segmentAmount, 0n);
    segments = calculated.map(({ policy, activeCalendarDays, segmentAmount }) => ({
      policyPublicId: policy.publicId,
      policyVersion: policy.version,
      prorationMode: policy.prorationMode,
      activeCalendarDays,
      amountCents: segmentAmount.toString(),
    }));
  }
  if (amountCents === 0n) return;

  await db.employeeEarning.upsert({
    where: {
      restaurantId_employeeId_sourceType_sourceId_type: {
        restaurantId,
        employeeId,
        sourceType: EmployeeEarningSourceType.MONTHLY_BASE,
        sourceId: period.referenceMonth,
        type: EmployeeEarningType.FIXED_MONTHLY,
      },
    },
    update: {},
    create: {
      restaurantId,
      employeeId,
      type: EmployeeEarningType.FIXED_MONTHLY,
      direction: EmployeeEarningDirection.CREDIT,
      amountCents,
      sourceType: EmployeeEarningSourceType.MONTHLY_BASE,
      sourceId: period.referenceMonth,
      sourcePublicId: period.referenceMonth,
      policyId: latest.id,
      policyVersion: latest.version,
      snapshot: {
        referenceMonth: period.referenceMonth,
        timeZone: period.timeZone,
        baseModel: EmployeeCompensationBaseModel.FIXED_MONTHLY,
        prorationMode: latest.prorationMode,
        amountCents: amountCents.toString(),
        segments,
      },
      occurredAt: period.gte,
    },
  });
}

async function ensureHourlyEarnings(
  db: EmployeeCompensationDb,
  restaurantId: number,
  employeeId: number,
  period: MonthPeriod,
) {
  const dateStart = new Date(Date.UTC(period.year, period.month - 1, 1));
  const dateEnd = new Date(Date.UTC(period.year, period.month, 1));
  const entries = await db.employeeWorkEntry.findMany({
    where: {
      restaurantId,
      employeeId,
      status: EmployeeWorkEntryStatus.APPROVED,
      workDate: { gte: dateStart, lt: dateEnd },
    },
    orderBy: { workDate: 'asc' },
  });
  for (const entry of entries) {
    const occurredAt = workDateOccurrence(entry.workDate, period);
    const policy = await repository.findEffectivePolicy(db, restaurantId, employeeId, occurredAt);
    if (
      !policy ||
      policy.baseModel !== EmployeeCompensationBaseModel.HOURLY ||
      policy.hourlyRateCents === null
    ) {
      continue;
    }
    const amountCents = calculateHourlyCents(policy.hourlyRateCents, entry.minutesWorked);
    if (amountCents === 0n) continue;
    await db.employeeEarning.upsert({
      where: {
        restaurantId_employeeId_sourceType_sourceId_type: {
          restaurantId,
          employeeId,
          sourceType: EmployeeEarningSourceType.WORK_ENTRY,
          sourceId: entry.publicId,
          type: EmployeeEarningType.HOURLY,
        },
      },
      update: {},
      create: {
        restaurantId,
        employeeId,
        type: EmployeeEarningType.HOURLY,
        direction: EmployeeEarningDirection.CREDIT,
        amountCents,
        sourceType: EmployeeEarningSourceType.WORK_ENTRY,
        sourceId: entry.publicId,
        sourcePublicId: entry.publicId,
        policyId: policy.id,
        policyVersion: policy.version,
        financialBaseCents: policy.hourlyRateCents,
        snapshot: {
          workEntryPublicId: entry.publicId,
          workDate: entry.workDate.toISOString().slice(0, 10),
          minutesWorked: entry.minutesWorked,
          hourlyRateCents: policy.hourlyRateCents.toString(),
          policyPublicId: policy.publicId,
          policyVersion: policy.version,
          rounding: 'HALF_UP',
          amountCents: amountCents.toString(),
        },
        occurredAt,
      },
    });
  }
}

async function refreshDraftSettlement(input: {
  db: EmployeeCompensationDb;
  restaurantId: number;
  employeeId: number;
  period: MonthPeriod;
  settlementId?: number;
}) {
  await ensureBaseEarning(input.db, input.restaurantId, input.employeeId, input.period);
  await ensureHourlyEarnings(input.db, input.restaurantId, input.employeeId, input.period);

  const now = new Date();
  if (input.settlementId) {
    await input.db.employeeSettlementItem.updateMany({
      where: { restaurantId: input.restaurantId, settlementId: input.settlementId, active: true },
      data: { active: false, releasedAt: now },
    });
  }
  const earnings = await input.db.employeeEarning.findMany({
    where: {
      restaurantId: input.restaurantId,
      employeeId: input.employeeId,
      occurredAt: { gte: input.period.gte, lt: input.period.lt },
      settlementItems: { none: { active: true } },
    },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  });
  const totals = calculateSettlementTotals(earnings);
  return { earnings, totals };
}

class EmployeeSettlementService {
  async generate(input: {
    restaurantId: unknown;
    employeeId: unknown;
    referenceMonth: string;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = normalizeId(input.employeeId, 'Funcionário');
    return withTenantDbContext(restaurantId, async (db) => {
      await repository.findEmployee(db, restaurantId, employeeId);
      await repository.lockEmployee(db, restaurantId, employeeId);
      const timeZone = await repository.getTimeZone(db, restaurantId);
      const period = getRestaurantMonthPeriod(input.referenceMonth, timeZone);
      let settlement = await db.employeeSettlement.findUnique({
        where: {
          restaurantId_employeeId_periodYear_periodMonth: {
            restaurantId,
            employeeId,
            periodYear: period.year,
            periodMonth: period.month,
          },
        },
      });
      if (settlement && settlement.status !== EmployeeSettlementStatus.DRAFT) {
        return serializeFinancial(
          await db.employeeSettlement.findUniqueOrThrow({
            where: { id_restaurantId: { id: settlement.id, restaurantId } },
            include: settlementInclude,
          }),
        );
      }
      const projection = await refreshDraftSettlement({
        db,
        restaurantId,
        employeeId,
        period,
        settlementId: settlement?.id,
      });
      if (!settlement) {
        try {
          settlement = await db.employeeSettlement.create({
            data: {
              restaurantId,
              employeeId,
              periodYear: period.year,
              periodMonth: period.month,
              periodStart: period.gte,
              periodEnd: period.lt,
              ...projection.totals,
            },
          });
        } catch (error) {
          if (isUniqueConflict(error)) {
            throw new Error('O acerto foi gerado por outra sessão.');
          }
          throw error;
        }
      } else {
        settlement = await db.employeeSettlement.update({
          where: { id_restaurantId: { id: settlement.id, restaurantId } },
          data: { ...projection.totals, version: { increment: 1 } },
        });
      }

      for (const earning of projection.earnings) {
        await db.employeeSettlementItem.upsert({
          where: { settlementId_earningId: { settlementId: settlement.id, earningId: earning.id } },
          update: {
            typeSnapshot: earning.type,
            directionSnapshot: earning.direction,
            amountCentsSnapshot: earning.amountCents,
            active: true,
            releasedAt: null,
          },
          create: {
            restaurantId,
            settlementId: settlement.id,
            earningId: earning.id,
            typeSnapshot: earning.type,
            directionSnapshot: earning.direction,
            amountCentsSnapshot: earning.amountCents,
          },
        });
      }
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_SETTLEMENT_GENERATED',
        resource: `EmployeeSettlement:${settlement.publicId}`,
        metadata: {
          settlementPublicId: settlement.publicId,
          employeeId,
          referenceMonth: period.referenceMonth,
          grossCreditsCents: projection.totals.grossCreditsCents.toString(),
          grossDebitsCents: projection.totals.grossDebitsCents.toString(),
          totalDueCents: projection.totals.totalDueCents.toString(),
          itemCount: projection.earnings.length,
        },
      });
      return serializeFinancial(
        await db.employeeSettlement.findUniqueOrThrow({
          where: { id_restaurantId: { id: settlement.id, restaurantId } },
          include: settlementInclude,
        }),
      );
    });
  }

  async confirm(input: { restaurantId: unknown; publicId: string; actor: CompensationActor }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    return withTenantDbContext(restaurantId, async (db) => {
      let settlement = await db.employeeSettlement.findFirst({
        where: { restaurantId, publicId: input.publicId },
      });
      if (!settlement) throw new Error('Acerto não encontrado.');
      await repository.lockSettlement(db, restaurantId, settlement.id);
      settlement = await db.employeeSettlement.findUniqueOrThrow({
        where: { id_restaurantId: { id: settlement.id, restaurantId } },
      });
      if (settlement.status !== EmployeeSettlementStatus.DRAFT) {
        return serializeFinancial(
          await db.employeeSettlement.findUniqueOrThrow({
            where: { id_restaurantId: { id: settlement.id, restaurantId } },
            include: settlementInclude,
          }),
        );
      }
      const timeZone = await repository.getTimeZone(db, restaurantId);
      const period = getRestaurantMonthPeriod(
        referenceMonth(settlement.periodYear, settlement.periodMonth),
        timeZone,
      );
      const projection = await refreshDraftSettlement({
        db,
        restaurantId,
        employeeId: settlement.employeeId,
        period,
        settlementId: settlement.id,
      });
      for (const earning of projection.earnings) {
        await db.employeeSettlementItem.upsert({
          where: { settlementId_earningId: { settlementId: settlement.id, earningId: earning.id } },
          update: {
            typeSnapshot: earning.type,
            directionSnapshot: earning.direction,
            amountCentsSnapshot: earning.amountCents,
            active: true,
            releasedAt: null,
          },
          create: {
            restaurantId,
            settlementId: settlement.id,
            earningId: earning.id,
            typeSnapshot: earning.type,
            directionSnapshot: earning.direction,
            amountCentsSnapshot: earning.amountCents,
          },
        });
      }
      const now = new Date();
      const changed = await db.employeeSettlement.updateMany({
        where: {
          id: settlement.id,
          restaurantId,
          status: EmployeeSettlementStatus.DRAFT,
          version: settlement.version,
        },
        data: {
          ...projection.totals,
          status: EmployeeSettlementStatus.CONFIRMED,
          confirmedAt: now,
          confirmedById: input.actor.userId,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('O acerto foi confirmado por outra sessão.');
      await db.employeeEarning.updateMany({
        where: {
          restaurantId,
          settlementItems: { some: { settlementId: settlement.id, active: true } },
        },
        data: { settledAt: now },
      });
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_SETTLEMENT_CONFIRMED',
        resource: `EmployeeSettlement:${settlement.publicId}`,
        metadata: {
          settlementPublicId: settlement.publicId,
          grossCreditsCents: projection.totals.grossCreditsCents.toString(),
          grossDebitsCents: projection.totals.grossDebitsCents.toString(),
          totalDueCents: projection.totals.totalDueCents.toString(),
        },
      });
      return serializeFinancial(
        await db.employeeSettlement.findUniqueOrThrow({
          where: { id_restaurantId: { id: settlement.id, restaurantId } },
          include: settlementInclude,
        }),
      );
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
      let settlement = await db.employeeSettlement.findFirst({
        where: { restaurantId, publicId: input.publicId },
      });
      if (!settlement) throw new Error('Acerto não encontrado.');
      await repository.lockSettlement(db, restaurantId, settlement.id);
      settlement = await db.employeeSettlement.findUniqueOrThrow({
        where: { id_restaurantId: { id: settlement.id, restaurantId } },
      });
      if (settlement.status === EmployeeSettlementStatus.CANCELED) {
        return serializeFinancial(settlement);
      }
      const paidCents = await repository.activePaymentTotal(db, restaurantId, settlement.id);
      if (paidCents > 0n) {
        throw new Error(
          'Acerto com pagamento ativo não pode ser cancelado; reverta os pagamentos.',
        );
      }
      if (
        settlement.status !== EmployeeSettlementStatus.DRAFT &&
        settlement.status !== EmployeeSettlementStatus.CONFIRMED
      ) {
        throw new Error('Este acerto não pode ser cancelado no estado atual.');
      }
      const items = await db.employeeSettlementItem.findMany({
        where: { restaurantId, settlementId: settlement.id, active: true },
        select: { earningId: true },
      });
      const now = new Date();
      const changed = await db.employeeSettlement.updateMany({
        where: {
          id: settlement.id,
          restaurantId,
          status: settlement.status,
          version: settlement.version,
        },
        data: {
          status: EmployeeSettlementStatus.CANCELED,
          canceledAt: now,
          canceledById: input.actor.userId,
          cancelReason: reason,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('O acerto foi alterado por outra sessão.');
      await db.employeeSettlementItem.updateMany({
        where: { restaurantId, settlementId: settlement.id, active: true },
        data: { active: false, releasedAt: now },
      });
      if (items.length) {
        await db.employeeEarning.updateMany({
          where: { restaurantId, id: { in: items.map((item) => item.earningId) } },
          data: { settledAt: null },
        });
      }
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_SETTLEMENT_CANCELED',
        resource: `EmployeeSettlement:${settlement.publicId}`,
        metadata: { settlementPublicId: settlement.publicId, reason },
      });
      return serializeFinancial(
        await db.employeeSettlement.findUniqueOrThrow({
          where: { id_restaurantId: { id: settlement.id, restaurantId } },
          include: settlementInclude,
        }),
      );
    });
  }

  async registerPayment(input: {
    restaurantId: unknown;
    settlementPublicId: string;
    amountCents: unknown;
    method: EmployeeSettlementPaymentMethod;
    reference?: string | null;
    notes?: string | null;
    idempotencyKey: string;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const amountCents = assertMoneyCents(input.amountCents, 'Valor do pagamento', false);
    const normalizedKey = String(input.idempotencyKey || '').trim();
    if (normalizedKey.length < 8 || normalizedKey.length > 200) {
      throw new Error('Idempotency-Key deve ter entre 8 e 200 caracteres.');
    }
    const reference = input.reference?.trim() || null;
    const notes = input.notes?.trim() || null;
    const idempotencyKeyHash = sha256(normalizedKey);
    const requestFingerprint = sha256(
      JSON.stringify({
        settlementPublicId: input.settlementPublicId,
        amountCents: amountCents.toString(),
        method: input.method,
        reference,
        notes,
      }),
    );
    return withTenantDbContext(restaurantId, async (db) => {
      let settlement = await db.employeeSettlement.findFirst({
        where: { restaurantId, publicId: input.settlementPublicId },
      });
      if (!settlement) throw new Error('Acerto não encontrado.');
      await repository.lockSettlement(db, restaurantId, settlement.id);
      settlement = await db.employeeSettlement.findUniqueOrThrow({
        where: { id_restaurantId: { id: settlement.id, restaurantId } },
      });
      const existing = await db.employeeSettlementPayment.findFirst({
        where: { restaurantId, idempotencyKeyHash },
      });
      if (existing) {
        if (existing.requestFingerprint !== requestFingerprint) {
          throw new Error('Idempotency-Key já foi usada com outro pagamento.');
        }
        return serializeFinancial({
          payment: existing,
          settlement: await db.employeeSettlement.findUniqueOrThrow({
            where: { id_restaurantId: { id: settlement.id, restaurantId } },
            include: settlementInclude,
          }),
          idempotentReplay: true,
        });
      }
      if (
        settlement.status !== EmployeeSettlementStatus.CONFIRMED &&
        settlement.status !== EmployeeSettlementStatus.PARTIALLY_PAID
      ) {
        throw new Error('Somente acerto confirmado ou parcialmente pago recebe pagamento.');
      }
      const activePaidCents = await repository.activePaymentTotal(db, restaurantId, settlement.id);
      if (activePaidCents + amountCents > settlement.totalDueCents) {
        throw new Error('O pagamento ultrapassa o valor ainda devido no acerto.');
      }
      const payment = await db.employeeSettlementPayment.create({
        data: {
          restaurantId,
          settlementId: settlement.id,
          employeeId: settlement.employeeId,
          amountCents,
          method: input.method,
          reference,
          notes,
          idempotencyKeyHash,
          requestFingerprint,
          registeredById: input.actor.userId,
        },
      });
      const newPaidCents = activePaidCents + amountCents;
      const paid = newPaidCents === settlement.totalDueCents;
      const changed = await db.employeeSettlement.updateMany({
        where: {
          id: settlement.id,
          restaurantId,
          status: settlement.status,
          version: settlement.version,
        },
        data: {
          status: paid ? EmployeeSettlementStatus.PAID : EmployeeSettlementStatus.PARTIALLY_PAID,
          paidAt: paid ? payment.registeredAt : null,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('O acerto foi pago por outra sessão.');
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_SETTLEMENT_PAYMENT_REGISTERED',
        resource: `EmployeeSettlementPayment:${payment.publicId}`,
        metadata: {
          paymentPublicId: payment.publicId,
          settlementPublicId: settlement.publicId,
          amountCents: amountCents.toString(),
          method: input.method,
          status: paid ? EmployeeSettlementStatus.PAID : EmployeeSettlementStatus.PARTIALLY_PAID,
        },
      });
      return serializeFinancial({
        payment,
        settlement: await db.employeeSettlement.findUniqueOrThrow({
          where: { id_restaurantId: { id: settlement.id, restaurantId } },
          include: settlementInclude,
        }),
        idempotentReplay: false,
      });
    });
  }

  async reversePayment(input: {
    restaurantId: unknown;
    paymentPublicId: string;
    reason: unknown;
    actor: CompensationActor;
  }) {
    requireAdmin(input.actor);
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const reason = requireReason(input.reason, 'Motivo da reversão');
    return withTenantDbContext(restaurantId, async (db) => {
      let payment = await db.employeeSettlementPayment.findFirst({
        where: { restaurantId, publicId: input.paymentPublicId },
      });
      if (!payment) throw new Error('Pagamento não encontrado.');
      await repository.lockSettlement(db, restaurantId, payment.settlementId);
      payment = await db.employeeSettlementPayment.findUniqueOrThrow({
        where: { id_restaurantId: { id: payment.id, restaurantId } },
      });
      if (payment.status === EmployeeSettlementPaymentStatus.REVERSED) {
        return serializeFinancial(payment);
      }
      const settlement = await db.employeeSettlement.findUniqueOrThrow({
        where: { id_restaurantId: { id: payment.settlementId, restaurantId } },
      });
      const now = new Date();
      const changed = await db.employeeSettlementPayment.updateMany({
        where: {
          id: payment.id,
          restaurantId,
          status: EmployeeSettlementPaymentStatus.ACTIVE,
          version: payment.version,
        },
        data: {
          status: EmployeeSettlementPaymentStatus.REVERSED,
          reversedAt: now,
          reversedById: input.actor.userId,
          reverseReason: reason,
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error('O pagamento foi revertido por outra sessão.');
      const activePaidCents = await repository.activePaymentTotal(db, restaurantId, settlement.id);
      const nextStatus =
        activePaidCents === 0n
          ? EmployeeSettlementStatus.CONFIRMED
          : activePaidCents === settlement.totalDueCents
            ? EmployeeSettlementStatus.PAID
            : EmployeeSettlementStatus.PARTIALLY_PAID;
      await db.employeeSettlement.update({
        where: { id_restaurantId: { id: settlement.id, restaurantId } },
        data: {
          status: nextStatus,
          paidAt: nextStatus === EmployeeSettlementStatus.PAID ? settlement.paidAt || now : null,
          version: { increment: 1 },
        },
      });
      const reversed = await db.employeeSettlementPayment.findUniqueOrThrow({
        where: { id_restaurantId: { id: payment.id, restaurantId } },
      });
      await auditEmployeeCompensation(db, {
        ...input.actor,
        restaurantId,
        action: 'EMPLOYEE_SETTLEMENT_PAYMENT_REVERSED',
        resource: `EmployeeSettlementPayment:${reversed.publicId}`,
        metadata: {
          paymentPublicId: reversed.publicId,
          settlementPublicId: settlement.publicId,
          amountCents: reversed.amountCents.toString(),
          reason,
          settlementStatus: nextStatus,
        },
      });
      return serializeFinancial({
        payment: reversed,
        settlement: await db.employeeSettlement.findUniqueOrThrow({
          where: { id_restaurantId: { id: settlement.id, restaurantId } },
          include: settlementInclude,
        }),
      });
    });
  }

  async listAdmin(input: {
    restaurantId: unknown;
    employeeId?: unknown;
    status?: EmployeeSettlementStatus;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    const employeeId = input.employeeId ? normalizeId(input.employeeId, 'Funcionário') : undefined;
    return withTenantDbContext(restaurantId, async (db) =>
      serializeFinancial(
        await db.employeeSettlement.findMany({
          where: {
            restaurantId,
            ...(employeeId ? { employeeId } : {}),
            ...(input.status ? { status: input.status } : {}),
          },
          include: {
            employee: { select: { id: true, name: true, subRole: true, active: true } },
            payments: true,
          },
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { createdAt: 'desc' }],
          take: 500,
        }),
      ),
    );
  }

  async getAdmin(input: { restaurantId: unknown; publicId: string }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    return withTenantDbContext(restaurantId, async (db) => {
      const settlement = await db.employeeSettlement.findFirst({
        where: { restaurantId, publicId: input.publicId },
        include: settlementInclude,
      });
      if (!settlement) throw new Error('Acerto não encontrado.');
      return serializeFinancial(settlement);
    });
  }

  async listOwn(input: { restaurantId: unknown; actor: CompensationActor }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    if (input.actor.role !== UserRole.FUNCIONARIO) {
      throw new Error('Esta consulta é exclusiva do próprio funcionário.');
    }
    return withTenantDbContext(restaurantId, async (db) => {
      await repository.findEmployee(db, restaurantId, input.actor.userId);
      return serializeFinancial(
        await db.employeeSettlement.findMany({
          where: { restaurantId, employeeId: input.actor.userId },
          include: { payments: { select: ownPaymentSelect } },
          orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        }),
      );
    });
  }

  async getOwn(input: { restaurantId: unknown; publicId: string; actor: CompensationActor }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    if (input.actor.role !== UserRole.FUNCIONARIO) {
      throw new Error('Esta consulta é exclusiva do próprio funcionário.');
    }
    return withTenantDbContext(restaurantId, async (db) => {
      const settlement = await db.employeeSettlement.findFirst({
        where: { restaurantId, publicId: input.publicId, employeeId: input.actor.userId },
        include: settlementInclude,
      });
      if (!settlement) throw new Error('Acerto não encontrado.');
      return serializeFinancial(settlement);
    });
  }

  async getOwnPayment(input: {
    restaurantId: unknown;
    publicId: string;
    actor: CompensationActor;
  }) {
    const restaurantId = normalizeId(input.restaurantId, 'Restaurante');
    if (input.actor.role !== UserRole.FUNCIONARIO) {
      throw new Error('Esta consulta é exclusiva do próprio funcionário.');
    }
    return withTenantDbContext(restaurantId, async (db) => {
      const payment = await db.employeeSettlementPayment.findFirst({
        where: {
          restaurantId,
          publicId: input.publicId,
          employeeId: input.actor.userId,
        },
        select: {
          ...ownPaymentSelect,
          settlement: {
            select: {
              publicId: true,
              status: true,
              periodYear: true,
              periodMonth: true,
              totalDueCents: true,
              paidAt: true,
            },
          },
        },
      });
      if (!payment) throw new Error('Pagamento não encontrado.');
      return serializeFinancial(payment);
    });
  }
}

export default new EmployeeSettlementService();
