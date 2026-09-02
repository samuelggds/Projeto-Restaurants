// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EmployeeCompensationVariableModel,
  EmployeeEarningDirection,
  EmployeeEarningType,
} from '@prisma/client';

import waiterCompensationProjectionService from './WaiterCompensationProjectionService.js';

const closedAt = new Date('2026-08-20T20:00:00.000Z');

function createDb({ billItems, paymentIntents, policy, earnings = [] }) {
  const createdEarnings = [];
  const audits = [];
  const session = {
    id: 55,
    publicId: 'table-session-55',
    status: 'CLOSED',
    closedAt,
    forcedClosed: false,
    waiterAssignments: [
      {
        id: 4,
        publicId: 'assignment-4',
        waiterId: 9,
        assignedAt: new Date('2026-08-20T18:00:00.000Z'),
        unassignedAt: null,
      },
    ],
    billItems,
    paymentIntents,
  };
  const allEarnings = earnings.map((entry) => ({ settlementItems: [], ...entry }));
  const db = {
    $queryRaw: async () => [{ id: 55 }],
    tableSession: {
      findFirst: async ({ where }) => {
        assert.equal(where.id, 55);
        assert.equal(where.restaurantId, 7);
        return session;
      },
    },
    employeeCompensationPolicy: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.employeeId, 9);
        return policy;
      },
    },
    employeeEarning: {
      findMany: async ({ where }) => {
        assert.equal(where.restaurantId, 7);
        assert.equal(where.employeeId, 9);
        assert.equal(where.tableSessionId, 55);
        return allEarnings;
      },
      create: async ({ data }) => {
        const earning = {
          id: 100 + allEarnings.length,
          publicId: `earning-${100 + allEarnings.length}`,
          settlementItems: [],
          ...data,
        };
        allEarnings.push(earning);
        createdEarnings.push(earning);
        return earning;
      },
      upsert: async ({ where, create }) => {
        const identity = where.restaurantId_employeeId_sourceType_sourceId_type;
        const existing = allEarnings.find(
          (entry) =>
            entry.employeeId === identity.employeeId &&
            entry.sourceType === identity.sourceType &&
            entry.sourceId === identity.sourceId &&
            entry.type === identity.type,
        );
        if (existing) return existing;
        const earning = {
          id: 100 + allEarnings.length,
          publicId: `earning-${100 + allEarnings.length}`,
          settlementItems: [],
          ...create,
        };
        allEarnings.push(earning);
        createdEarnings.push(earning);
        return earning;
      },
    },
    auditLog: {
      create: async ({ data }) => {
        audits.push(data);
        return data;
      },
    },
  };
  return { db, createdEarnings, audits };
}

function policy(variableModel, variableBasisPoints) {
  return {
    id: 31,
    publicId: 'policy-31',
    employeeId: 9,
    variableModel,
    variableBasisPoints,
    fixedPerTableCents: null,
    version: 3,
  };
}

function paidItem(unitPriceCents) {
  return {
    unitPriceCents,
    financialStatus: 'PAID',
    paidAt: new Date('2026-08-20T19:50:00.000Z'),
    canceledAt: null,
    order: { status: 'ENTREGUE' },
  };
}

function refundedItem(unitPriceCents) {
  return {
    unitPriceCents,
    financialStatus: 'REFUNDED',
    paidAt: new Date('2026-08-20T19:50:00.000Z'),
    canceledAt: null,
    order: { status: 'ENTREGUE' },
  };
}

function originalTableSalesEarning(amountCents = 1000n) {
  return {
    id: 70,
    publicId: 'earning-original',
    restaurantId: 7,
    employeeId: 9,
    tableSessionId: 55,
    type: EmployeeEarningType.WAITER_TABLE_SALES,
    direction: EmployeeEarningDirection.CREDIT,
    amountCents,
    policyId: 31,
    policyVersion: 3,
    appliedBasisPoints: 1000,
  };
}

test('projeta comissão sobre a taxa de serviço paga e congela a versão da política', async () => {
  const fixture = createDb({
    billItems: [paidItem(10_000n)],
    paymentIntents: [
      {
        id: 81,
        publicId: 'payment-81',
        status: 'PAID',
        serviceFeeCents: 1_000n,
        paidAt: new Date('2026-08-20T19:55:00.000Z'),
        refundedAt: null,
      },
    ],
    policy: policy(EmployeeCompensationVariableModel.SERVICE_FEE_PERCENTAGE, 5000),
  });

  const result = await waiterCompensationProjectionService.project({
    db: fixture.db,
    restaurantId: 7,
    tableSessionId: 55,
  });

  assert.equal(result.created, true);
  assert.equal(fixture.createdEarnings[0].amountCents, 500n);
  assert.equal(fixture.createdEarnings[0].financialBaseCents, 1_000n);
  assert.equal(fixture.createdEarnings[0].policyVersion, 3);
  assert.equal(fixture.createdEarnings[0].snapshot.assignmentPublicId, 'assignment-4');
  assert.equal(fixture.createdEarnings[0].snapshot.policyPublicId, 'policy-31');
  assert.equal(fixture.audits[0].action, 'EMPLOYEE_WAITER_EARNING_PROJECTED');
});

test('reembolso parcial gera somente o débito incremental e a repetição é idempotente', async () => {
  const fixture = createDb({
    billItems: [paidItem(6_000n), refundedItem(4_000n)],
    paymentIntents: [
      {
        id: 82,
        publicId: 'refund-82',
        status: 'REFUNDED',
        serviceFeeCents: 0n,
        paidAt: new Date('2026-08-20T19:55:00.000Z'),
        refundedAt: new Date('2026-08-21T09:00:00.000Z'),
      },
    ],
    policy: policy(EmployeeCompensationVariableModel.TABLE_SALES_PERCENTAGE, 1000),
    earnings: [originalTableSalesEarning()],
  });

  const first = await waiterCompensationProjectionService.project({
    db: fixture.db,
    restaurantId: 7,
    tableSessionId: 55,
  });
  const second = await waiterCompensationProjectionService.project({
    db: fixture.db,
    restaurantId: 7,
    tableSessionId: 55,
  });

  assert.equal(first.created, true);
  assert.equal(fixture.createdEarnings.length, 1);
  assert.equal(fixture.createdEarnings[0].direction, EmployeeEarningDirection.DEBIT);
  assert.equal(fixture.createdEarnings[0].amountCents, 400n);
  assert.equal(fixture.createdEarnings[0].reversesEarningId, 70);
  assert.equal(fixture.createdEarnings[0].paymentIntentId, 82);
  assert.deepEqual(second, { created: false, reason: 'ALREADY_PROJECTED' });
});

test('reembolso total compensa integralmente um ganho já lançado', async () => {
  const fixture = createDb({
    billItems: [refundedItem(10_000n)],
    paymentIntents: [
      {
        id: 83,
        publicId: 'refund-83',
        status: 'REFUNDED',
        serviceFeeCents: 0n,
        paidAt: new Date('2026-08-20T19:55:00.000Z'),
        refundedAt: new Date('2026-08-21T10:00:00.000Z'),
      },
    ],
    policy: policy(EmployeeCompensationVariableModel.TABLE_SALES_PERCENTAGE, 1000),
    earnings: [originalTableSalesEarning()],
  });

  const result = await waiterCompensationProjectionService.project({
    db: fixture.db,
    restaurantId: 7,
    tableSessionId: 55,
  });

  assert.equal(result.created, true);
  assert.equal(fixture.createdEarnings[0].amountCents, 1_000n);
  assert.equal(fixture.createdEarnings[0].direction, EmployeeEarningDirection.DEBIT);
});
