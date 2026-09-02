import {
  EmployeeCompensationVariableModel,
  EmployeeEarningDirection,
  EmployeeEarningSourceType,
  EmployeeEarningType,
  OrderStatus,
  TableBillItemFinancialStatus,
  TablePaymentIntentStatus,
  TableSessionStatus,
  type Prisma,
} from '@prisma/client';

import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { calculateBasisPoints, sumMoneyCents } from '../domain/employeeCompensationRules.js';
import repository from '../repositories/EmployeeCompensationRepository.js';

type ProjectionDb = Prisma.TransactionClient;

const WAITER_EARNING_TYPES = [
  EmployeeEarningType.WAITER_SERVICE_FEE,
  EmployeeEarningType.WAITER_TABLE_FIXED,
  EmployeeEarningType.WAITER_TABLE_SALES,
  EmployeeEarningType.REFUND_REVERSAL,
];

function earningTypeForModel(model: EmployeeCompensationVariableModel) {
  if (model === EmployeeCompensationVariableModel.SERVICE_FEE_PERCENTAGE) {
    return EmployeeEarningType.WAITER_SERVICE_FEE;
  }
  if (model === EmployeeCompensationVariableModel.FIXED_PER_TABLE) {
    return EmployeeEarningType.WAITER_TABLE_FIXED;
  }
  if (model === EmployeeCompensationVariableModel.TABLE_SALES_PERCENTAGE) {
    return EmployeeEarningType.WAITER_TABLE_SALES;
  }
  return null;
}

function latestDate(values: Array<Date | null | undefined>, fallback: Date) {
  return values.reduce<Date>(
    (latest, value) => (value && value > latest ? value : latest),
    fallback,
  );
}

export class WaiterCompensationProjectionService {
  async project(input: {
    db: ProjectionDb;
    restaurantId: number;
    tableSessionId: number;
    now?: Date;
  }) {
    const now = input.now || new Date();
    await setTenantDbContext(input.db, input.restaurantId);
    await repository.lockTableSession(input.db, input.restaurantId, input.tableSessionId);
    const session = await input.db.tableSession.findFirst({
      where: { id: input.tableSessionId, restaurantId: input.restaurantId },
      select: {
        id: true,
        publicId: true,
        status: true,
        closedAt: true,
        forcedClosed: true,
        waiterAssignments: {
          select: {
            id: true,
            publicId: true,
            waiterId: true,
            assignedAt: true,
            unassignedAt: true,
          },
          orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
        },
        billItems: {
          select: {
            unitPriceCents: true,
            financialStatus: true,
            paidAt: true,
            canceledAt: true,
            order: { select: { status: true } },
          },
        },
        paymentIntents: {
          select: {
            id: true,
            publicId: true,
            status: true,
            serviceFeeCents: true,
            paidAt: true,
            refundedAt: true,
          },
        },
      },
    });
    if (!session || session.status !== TableSessionStatus.CLOSED || !session.closedAt) {
      return { created: false, reason: 'SESSION_NOT_CLOSED' as const };
    }

    const eligibleItems = session.billItems.filter(
      (item) =>
        !item.canceledAt &&
        item.order.status !== OrderStatus.CANCELADO &&
        item.financialStatus !== TableBillItemFinancialStatus.REFUNDED,
    );
    const hasEligibleConsumption = eligibleItems.length > 0;
    if (eligibleItems.some((item) => item.financialStatus !== TableBillItemFinancialStatus.PAID)) {
      return { created: false, reason: 'OUTSTANDING_BALANCE' as const };
    }

    const paidIntents = session.paymentIntents.filter(
      (intent) => intent.status === TablePaymentIntentStatus.PAID,
    );
    const eligibilityAt = latestDate(
      [
        session.closedAt,
        ...eligibleItems.map((item) => item.paidAt),
        ...paidIntents.map((intent) => intent.paidAt),
      ],
      session.closedAt,
    );
    const assignment = session.waiterAssignments.find(
      (entry) =>
        entry.assignedAt <= eligibilityAt &&
        (!entry.unassignedAt || entry.unassignedAt > eligibilityAt),
    );
    if (!assignment) return { created: false, reason: 'NO_WAITER_ASSIGNMENT' as const };

    const policy = await repository.findEffectivePolicy(
      input.db,
      input.restaurantId,
      assignment.waiterId,
      eligibilityAt,
    );
    if (!policy || policy.variableModel === EmployeeCompensationVariableModel.NONE) {
      return { created: false, reason: 'NO_VARIABLE_POLICY' as const };
    }
    const earningType = earningTypeForModel(policy.variableModel);
    if (!earningType) return { created: false, reason: 'NO_VARIABLE_POLICY' as const };

    const netTableSalesCents = sumMoneyCents(eligibleItems.map((item) => item.unitPriceCents));
    const netServiceFeeCents = sumMoneyCents(paidIntents.map((intent) => intent.serviceFeeCents));
    const financialBaseCents =
      policy.variableModel === EmployeeCompensationVariableModel.SERVICE_FEE_PERCENTAGE
        ? netServiceFeeCents
        : policy.variableModel === EmployeeCompensationVariableModel.TABLE_SALES_PERCENTAGE
          ? netTableSalesCents
          : netTableSalesCents;
    const desiredAmountCents = !hasEligibleConsumption
      ? 0n
      : policy.variableModel === EmployeeCompensationVariableModel.FIXED_PER_TABLE
        ? policy.fixedPerTableCents || 0n
        : calculateBasisPoints(financialBaseCents, policy.variableBasisPoints || 0);

    const existing = await input.db.employeeEarning.findMany({
      where: {
        restaurantId: input.restaurantId,
        employeeId: assignment.waiterId,
        tableSessionId: session.id,
        type: { in: WAITER_EARNING_TYPES },
      },
      include: {
        settlementItems: {
          where: { active: true },
          include: { settlement: { select: { publicId: true, status: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const credits = existing
      .filter((entry) => entry.direction === EmployeeEarningDirection.CREDIT)
      .reduce((total, entry) => total + entry.amountCents, 0n);
    const debits = existing
      .filter((entry) => entry.direction === EmployeeEarningDirection.DEBIT)
      .reduce((total, entry) => total + entry.amountCents, 0n);
    const currentNetCents = credits - debits;

    if (currentNetCents === desiredAmountCents) {
      return { created: false, reason: 'ALREADY_PROJECTED' as const };
    }
    if (currentNetCents < desiredAmountCents && existing.length > 0) {
      return { created: false, reason: 'HISTORICAL_POLICY_SNAPSHOT_PRESERVED' as const };
    }

    if (existing.length === 0) {
      if (desiredAmountCents === 0n) {
        return {
          created: false,
          reason: hasEligibleConsumption
            ? ('ZERO_COMMISSION' as const)
            : ('NO_ELIGIBLE_CONSUMPTION' as const),
        };
      }
      const earning = await input.db.employeeEarning.create({
        data: {
          restaurantId: input.restaurantId,
          employeeId: assignment.waiterId,
          type: earningType,
          direction: EmployeeEarningDirection.CREDIT,
          amountCents: desiredAmountCents,
          sourceType: EmployeeEarningSourceType.TABLE_SESSION,
          sourceId: session.publicId,
          sourcePublicId: session.publicId,
          policyId: policy.id,
          policyVersion: policy.version,
          financialBaseCents,
          appliedBasisPoints: policy.variableBasisPoints,
          tableSessionId: session.id,
          snapshot: {
            tableSessionPublicId: session.publicId,
            assignmentPublicId: assignment.publicId,
            employeeId: assignment.waiterId,
            policyPublicId: policy.publicId,
            policyVersion: policy.version,
            variableModel: policy.variableModel,
            financialBaseCents: financialBaseCents.toString(),
            netTableSalesCents: netTableSalesCents.toString(),
            netServiceFeeCents: netServiceFeeCents.toString(),
            variableBasisPoints: policy.variableBasisPoints,
            fixedPerTableCents: policy.fixedPerTableCents?.toString() || null,
            amountCents: desiredAmountCents.toString(),
            eligibleAt: eligibilityAt.toISOString(),
          },
          occurredAt: eligibilityAt,
        },
      });
      await input.db.auditLog.create({
        data: {
          userId: null,
          userRole: 'SYSTEM',
          restaurantId: input.restaurantId,
          action: 'EMPLOYEE_WAITER_EARNING_PROJECTED',
          resource: `EmployeeEarning:${earning.publicId}`,
          metadata: {
            earningPublicId: earning.publicId,
            tableSessionPublicId: session.publicId,
            policyPublicId: policy.publicId,
            policyVersion: policy.version,
            type: earning.type,
            amountCents: desiredAmountCents.toString(),
          },
        },
      });
      return { created: true, earning };
    }

    if (currentNetCents <= desiredAmountCents) {
      return { created: false, reason: 'ALREADY_PROJECTED' as const };
    }
    const original = existing.find((entry) => entry.direction === EmployeeEarningDirection.CREDIT);
    if (!original) return { created: false, reason: 'NO_ORIGINAL_EARNING' as const };
    const reversalAmountCents = currentNetCents - desiredAmountCents;
    const latestRefund = session.paymentIntents
      .filter((intent) => intent.status === TablePaymentIntentStatus.REFUNDED)
      .sort(
        (left, right) => (right.refundedAt?.getTime() || 0) - (left.refundedAt?.getTime() || 0),
      )[0];
    const reversalSourceId = `${session.publicId}:${desiredAmountCents.toString()}`;
    const reversal = await input.db.employeeEarning.upsert({
      where: {
        restaurantId_employeeId_sourceType_sourceId_type: {
          restaurantId: input.restaurantId,
          employeeId: assignment.waiterId,
          sourceType: EmployeeEarningSourceType.REFUND_REVERSAL,
          sourceId: reversalSourceId,
          type: EmployeeEarningType.REFUND_REVERSAL,
        },
      },
      update: {},
      create: {
        restaurantId: input.restaurantId,
        employeeId: assignment.waiterId,
        type: EmployeeEarningType.REFUND_REVERSAL,
        direction: EmployeeEarningDirection.DEBIT,
        amountCents: reversalAmountCents,
        sourceType: EmployeeEarningSourceType.REFUND_REVERSAL,
        sourceId: reversalSourceId,
        sourcePublicId: latestRefund?.publicId || session.publicId,
        policyId: original.policyId,
        policyVersion: original.policyVersion,
        financialBaseCents,
        appliedBasisPoints: original.appliedBasisPoints,
        tableSessionId: session.id,
        paymentIntentId: latestRefund?.id || null,
        reversesEarningId: original.id,
        snapshot: {
          tableSessionPublicId: session.publicId,
          refundedPaymentIntentPublicIds: session.paymentIntents
            .filter((intent) => intent.status === TablePaymentIntentStatus.REFUNDED)
            .map((intent) => intent.publicId),
          reversedEarningPublicId: original.publicId,
          previousSettlementPublicId: original.settlementItems[0]?.settlement.publicId || null,
          previousSettlementStatus: original.settlementItems[0]?.settlement.status || null,
          previousNetCents: currentNetCents.toString(),
          correctedNetCents: desiredAmountCents.toString(),
          amountCents: reversalAmountCents.toString(),
        },
        occurredAt: latestRefund?.refundedAt || now,
      },
    });
    await input.db.auditLog.create({
      data: {
        userId: null,
        userRole: 'SYSTEM',
        restaurantId: input.restaurantId,
        action: 'EMPLOYEE_WAITER_EARNING_REFUND_REVERSED',
        resource: `EmployeeEarning:${reversal.publicId}`,
        metadata: {
          earningPublicId: reversal.publicId,
          reversedEarningPublicId: original.publicId,
          tableSessionPublicId: session.publicId,
          amountCents: reversalAmountCents.toString(),
        },
      },
    });
    return { created: true, earning: reversal };
  }
}

export default new WaiterCompensationProjectionService();
