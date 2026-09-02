import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EmployeeCompensationBaseModel,
  EmployeeCompensationProrationMode,
  EmployeeCompensationVariableModel,
  EmployeeEarningDirection,
  FuncionarioSubRole,
} from '@prisma/client';

import {
  assertMoneyCents,
  calculateBasisPoints,
  calculateHourlyCents,
  calculateMonthlyBaseCents,
  calculateSettlementTotals,
  sumMoneyCents,
  validatePolicyForEmployee,
} from './employeeCompensationRules.js';

const basePolicy = {
  subRole: FuncionarioSubRole.GARCOM,
  baseModel: EmployeeCompensationBaseModel.NONE,
  fixedMonthlyCents: null,
  hourlyRateCents: null,
  variableModel: EmployeeCompensationVariableModel.NONE,
  variableBasisPoints: null,
  fixedPerTableCents: null,
  prorationMode: EmployeeCompensationProrationMode.NONE,
};

test('FIXED_MONTHLY e prorrateio NONE preservam integralmente os centavos', () => {
  assert.equal(
    calculateMonthlyBaseCents(180_000n, EmployeeCompensationProrationMode.NONE, 1, 30),
    180_000n,
  );
  validatePolicyForEmployee({
    ...basePolicy,
    baseModel: EmployeeCompensationBaseModel.FIXED_MONTHLY,
    fixedMonthlyCents: 180_000n,
  });
});

test('CALENDAR_DAYS usa divisão inteira com arredondamento half-up', () => {
  assert.equal(
    calculateMonthlyBaseCents(100_00n, EmployeeCompensationProrationMode.CALENDAR_DAYS, 10, 31),
    3_226n,
  );
});

test('HOURLY calcula minutos sem float e arredonda meio centavo para cima', () => {
  assert.equal(calculateHourlyCents(1_500n, 9_600), 240_000n);
  assert.equal(calculateHourlyCents(101n, 30), 51n);
});

test('basis points usa 100 = 1% e 10.000 = 100%', () => {
  assert.equal(calculateBasisPoints(2_000n, 7_000), 1_400n);
  assert.equal(calculateBasisPoints(30_000n, 200), 600n);
  assert.equal(calculateBasisPoints(9_999n, 10_000), 9_999n);
});

test('soma e validação monetária recusam float e overflow', () => {
  assert.equal(sumMoneyCents([100n, 200n, 300n]), 600n);
  assert.throws(() => assertMoneyCents(10.5), /inteiro/);
  assert.throws(() => sumMoneyCents([BigInt(Number.MAX_SAFE_INTEGER), 1n]), /seguro/);
});

test('garçom aceita fixo mais comissão, somente comissão e por hora mais comissão', () => {
  for (const baseModel of [
    EmployeeCompensationBaseModel.NONE,
    EmployeeCompensationBaseModel.FIXED_MONTHLY,
    EmployeeCompensationBaseModel.HOURLY,
  ]) {
    validatePolicyForEmployee({
      ...basePolicy,
      baseModel,
      fixedMonthlyCents:
        baseModel === EmployeeCompensationBaseModel.FIXED_MONTHLY ? 180_000n : null,
      hourlyRateCents: baseModel === EmployeeCompensationBaseModel.HOURLY ? 1_500n : null,
      variableModel: EmployeeCompensationVariableModel.SERVICE_FEE_PERCENTAGE,
      variableBasisPoints: 7_000,
    });
  }
});

test('FIXED_PER_TABLE e TABLE_SALES_PERCENTAGE usam configurações exclusivas', () => {
  validatePolicyForEmployee({
    ...basePolicy,
    variableModel: EmployeeCompensationVariableModel.FIXED_PER_TABLE,
    fixedPerTableCents: 400n,
  });
  validatePolicyForEmployee({
    ...basePolicy,
    variableModel: EmployeeCompensationVariableModel.TABLE_SALES_PERCENTAGE,
    variableBasisPoints: 200,
  });
});

test('cozinheiro e atendente recusam todas as comissões automáticas de mesa', () => {
  for (const subRole of [FuncionarioSubRole.COZINHA, FuncionarioSubRole.ATENDENTE]) {
    for (const variableModel of [
      EmployeeCompensationVariableModel.SERVICE_FEE_PERCENTAGE,
      EmployeeCompensationVariableModel.FIXED_PER_TABLE,
      EmployeeCompensationVariableModel.TABLE_SALES_PERCENTAGE,
    ]) {
      assert.throws(
        () =>
          validatePolicyForEmployee({
            ...basePolicy,
            subRole,
            variableModel,
            variableBasisPoints:
              variableModel === EmployeeCompensationVariableModel.FIXED_PER_TABLE ? null : 100,
            fixedPerTableCents:
              variableModel === EmployeeCompensationVariableModel.FIXED_PER_TABLE ? 400n : null,
          }),
        /exclusiva para GARCOM/,
      );
    }
  }
});

test('settlement agrega créditos e débitos sem permitir total negativo', () => {
  assert.deepEqual(
    calculateSettlementTotals([
      { direction: EmployeeEarningDirection.CREDIT, amountCents: 180_000n },
      { direction: EmployeeEarningDirection.CREDIT, amountCents: 2_000n },
      { direction: EmployeeEarningDirection.DEBIT, amountCents: 10_000n },
    ]),
    { grossCreditsCents: 182_000n, grossDebitsCents: 10_000n, totalDueCents: 172_000n },
  );
  assert.throws(
    () =>
      calculateSettlementTotals([
        { direction: EmployeeEarningDirection.CREDIT, amountCents: 100n },
        { direction: EmployeeEarningDirection.DEBIT, amountCents: 101n },
      ]),
    /débitos excedem/,
  );
});
