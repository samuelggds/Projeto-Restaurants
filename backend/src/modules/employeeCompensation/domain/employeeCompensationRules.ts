import {
  EmployeeCompensationBaseModel,
  EmployeeCompensationProrationMode,
  EmployeeCompensationVariableModel,
  EmployeeEarningDirection,
  FuncionarioSubRole,
} from '@prisma/client';

const BASIS_POINTS_DIVISOR = 10_000n;
const MINUTES_PER_HOUR = 60n;
const MAX_MONEY_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

export type SettlementAmount = {
  direction: EmployeeEarningDirection;
  amountCents: bigint;
};

function divideHalfUp(numerator: bigint, denominator: bigint) {
  if (numerator < 0n || denominator <= 0n) {
    throw new RangeError('A divisão monetária exige valores não negativos.');
  }
  return (numerator + denominator / 2n) / denominator;
}

export function assertMoneyCents(value: unknown, fieldName = 'valor', allowZero = true) {
  let cents: bigint;
  if (typeof value === 'bigint') {
    cents = value;
  } else if (typeof value === 'number' && Number.isSafeInteger(value)) {
    cents = BigInt(value);
  } else if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    cents = BigInt(value.trim());
  } else {
    throw new RangeError(`${fieldName} deve ser um inteiro em centavos.`);
  }

  if (cents < 0n || (!allowZero && cents === 0n) || cents > MAX_MONEY_CENTS) {
    throw new RangeError(
      `${fieldName} deve ser ${allowZero ? 'não negativo' : 'positivo'} e seguro em centavos.`,
    );
  }
  return cents;
}

export function moneyCentsToNumber(value: bigint, fieldName = 'valor') {
  return Number(assertMoneyCents(value, fieldName));
}

export function sumMoneyCents(values: readonly bigint[]) {
  return values.reduce((total, value, index) => {
    const next = total + assertMoneyCents(value, `valor[${index}]`);
    return assertMoneyCents(next, 'soma');
  }, 0n);
}

export function calculateBasisPoints(baseCents: bigint, basisPoints: number) {
  const base = assertMoneyCents(baseCents, 'base financeira');
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new RangeError('O percentual deve estar entre 0 e 10.000 basis points.');
  }
  return assertMoneyCents(
    divideHalfUp(base * BigInt(basisPoints), BASIS_POINTS_DIVISOR),
    'resultado percentual',
  );
}

export function calculateHourlyCents(hourlyRateCents: bigint, minutesWorked: number) {
  const rate = assertMoneyCents(hourlyRateCents, 'valor por hora');
  if (!Number.isSafeInteger(minutesWorked) || minutesWorked <= 0) {
    throw new RangeError('Os minutos trabalhados devem ser um inteiro positivo.');
  }
  return assertMoneyCents(
    divideHalfUp(rate * BigInt(minutesWorked), MINUTES_PER_HOUR),
    'remuneração por hora',
  );
}

export function calculateMonthlyBaseCents(
  fixedMonthlyCents: bigint,
  prorationMode: EmployeeCompensationProrationMode,
  activeCalendarDays: number,
  calendarDaysInMonth: number,
) {
  const fixed = assertMoneyCents(fixedMonthlyCents, 'valor mensal');
  if (prorationMode === EmployeeCompensationProrationMode.NONE) return fixed;
  if (
    !Number.isSafeInteger(activeCalendarDays) ||
    !Number.isSafeInteger(calendarDaysInMonth) ||
    calendarDaysInMonth < 28 ||
    calendarDaysInMonth > 31 ||
    activeCalendarDays < 0 ||
    activeCalendarDays > calendarDaysInMonth
  ) {
    throw new RangeError('Os dias usados no prorrateio são inválidos.');
  }
  return assertMoneyCents(
    divideHalfUp(fixed * BigInt(activeCalendarDays), BigInt(calendarDaysInMonth)),
    'valor mensal proporcional',
  );
}

export function calculateSettlementTotals(entries: readonly SettlementAmount[]) {
  const credits = sumMoneyCents(
    entries
      .filter((entry) => entry.direction === EmployeeEarningDirection.CREDIT)
      .map((entry) => entry.amountCents),
  );
  const debits = sumMoneyCents(
    entries
      .filter((entry) => entry.direction === EmployeeEarningDirection.DEBIT)
      .map((entry) => entry.amountCents),
  );
  if (debits > credits) {
    throw new RangeError(
      'Os débitos excedem os créditos; corrija os lançamentos antes de confirmar o acerto.',
    );
  }
  return { grossCreditsCents: credits, grossDebitsCents: debits, totalDueCents: credits - debits };
}

export function validatePolicyForEmployee(input: {
  subRole: FuncionarioSubRole | null;
  baseModel: EmployeeCompensationBaseModel;
  fixedMonthlyCents: bigint | null;
  hourlyRateCents: bigint | null;
  variableModel: EmployeeCompensationVariableModel;
  variableBasisPoints: number | null;
  fixedPerTableCents: bigint | null;
  prorationMode: EmployeeCompensationProrationMode;
}) {
  if (input.baseModel === EmployeeCompensationBaseModel.NONE) {
    if (input.fixedMonthlyCents !== null || input.hourlyRateCents !== null) {
      throw new RangeError('O modelo base NONE não aceita valores base.');
    }
  } else if (input.baseModel === EmployeeCompensationBaseModel.FIXED_MONTHLY) {
    assertMoneyCents(input.fixedMonthlyCents, 'valor mensal');
    if (input.hourlyRateCents !== null) {
      throw new RangeError('O modelo mensal não aceita valor por hora.');
    }
  } else {
    assertMoneyCents(input.hourlyRateCents, 'valor por hora');
    if (input.fixedMonthlyCents !== null) {
      throw new RangeError('O modelo por hora não aceita valor mensal.');
    }
  }

  if (
    input.prorationMode !== EmployeeCompensationProrationMode.NONE &&
    input.baseModel !== EmployeeCompensationBaseModel.FIXED_MONTHLY
  ) {
    throw new RangeError('Prorrateio aplica-se apenas ao modelo mensal fixo.');
  }

  if (input.variableModel !== EmployeeCompensationVariableModel.NONE) {
    if (input.subRole !== FuncionarioSubRole.GARCOM) {
      throw new RangeError('Comissão automática de mesa é exclusiva para GARCOM.');
    }
    if (input.variableModel === EmployeeCompensationVariableModel.FIXED_PER_TABLE) {
      assertMoneyCents(input.fixedPerTableCents, 'valor fixo por mesa', false);
      if (input.variableBasisPoints !== null) {
        throw new RangeError('Valor fixo por mesa não aceita percentual.');
      }
    } else {
      if (
        input.variableBasisPoints === null ||
        !Number.isSafeInteger(input.variableBasisPoints) ||
        input.variableBasisPoints < 0 ||
        input.variableBasisPoints > 10_000
      ) {
        throw new RangeError('A comissão deve estar entre 0 e 10.000 basis points.');
      }
      if (input.fixedPerTableCents !== null) {
        throw new RangeError('Comissão percentual não aceita valor fixo por mesa.');
      }
    }
  } else if (input.variableBasisPoints !== null || input.fixedPerTableCents !== null) {
    throw new RangeError('O modelo variável NONE não aceita valores de comissão.');
  }
}

export function earningDirectionForAdjustment(
  type: 'BONUS' | 'DEDUCTION' | 'ADVANCE' | 'CORRECTION',
  correctionDirection?: EmployeeEarningDirection,
) {
  if (type === 'BONUS') return EmployeeEarningDirection.CREDIT;
  if (type === 'DEDUCTION' || type === 'ADVANCE') return EmployeeEarningDirection.DEBIT;
  if (!correctionDirection) {
    throw new RangeError('Correção exige direção CREDIT ou DEBIT.');
  }
  return correctionDirection;
}
