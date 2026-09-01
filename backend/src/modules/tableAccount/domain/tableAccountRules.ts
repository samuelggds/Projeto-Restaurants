import type {
  MoneyCents,
  TableAccountActor,
  TableBillItemFinancialStatus,
  TablePaymentMethod,
  TablePaymentIntentStatus,
  TablePaymentSelectionMode,
  TablePrepaymentWindowDto,
  TableServiceFeeMode,
} from './tableAccountContracts.js';

export function assertMoneyCents(value: number, fieldName = 'valor'): MoneyCents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${fieldName} deve ser um inteiro não negativo em centavos.`);
  }

  return value;
}

export function sumMoneyCents(values: readonly number[]): MoneyCents {
  return values.reduce((total, value, index) => {
    const safeValue = assertMoneyCents(value, `valor[${index}]`);
    const nextTotal = total + safeValue;

    if (!Number.isSafeInteger(nextTotal)) {
      throw new RangeError('A soma ultrapassa o limite monetário seguro.');
    }

    return nextTotal;
  }, 0);
}

/**
 * Divide centavos sem perder dinheiro. Quando houver resto, um centavo é
 * acrescentado às primeiras partes, produzindo sempre o mesmo resultado.
 */
export function splitCentsEqually(totalCents: number, parts: number): MoneyCents[] {
  const safeTotal = assertMoneyCents(totalCents, 'total');

  if (
    !Number.isSafeInteger(parts) ||
    parts < 2 ||
    parts > 100 ||
    safeTotal === 0 ||
    parts > safeTotal
  ) {
    throw new RangeError('A quantidade de partes deve ser um inteiro entre 2 e 100.');
  }

  const base = Math.floor(safeTotal / parts);
  const remainder = safeTotal % parts;

  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Calcula a taxa em basis points (100 = 1%) com arredondamento half-up. */
export function calculateServiceFeeCents(
  subtotalCents: number,
  serviceFeeBasisPoints: number,
): MoneyCents {
  const safeSubtotal = assertMoneyCents(subtotalCents, 'subtotal');

  if (
    !Number.isSafeInteger(serviceFeeBasisPoints) ||
    serviceFeeBasisPoints < 0 ||
    serviceFeeBasisPoints > 10_000
  ) {
    throw new RangeError('A taxa de serviço deve estar entre 0 e 10.000 basis points.');
  }

  const rounded = (BigInt(safeSubtotal) * BigInt(serviceFeeBasisPoints) + 5_000n) / 10_000n;
  const result = Number(rounded);

  return assertMoneyCents(result, 'taxa de serviço');
}

export interface TableAccountBalanceInput {
  consumedCents: number;
  serviceFeeCents: number;
  grossPaidCents: number;
  refundedCents: number;
}

export interface TableAccountBalance {
  owedCents: MoneyCents;
  netPaidCents: MoneyCents;
  remainingCents: MoneyCents;
  overpaidCents: MoneyCents;
}

/**
 * Nunca devolve saldo negativo. Uma eventual inconsistência de pagamento a
 * maior fica explícita em overpaidCents para auditoria.
 */
export function calculateTableAccountBalance({
  consumedCents,
  serviceFeeCents,
  grossPaidCents,
  refundedCents,
}: TableAccountBalanceInput): TableAccountBalance {
  const safeConsumed = assertMoneyCents(consumedCents, 'total consumido');
  const safeFee = assertMoneyCents(serviceFeeCents, 'taxa de serviço');
  const safePaid = assertMoneyCents(grossPaidCents, 'total pago bruto');
  const safeRefunded = assertMoneyCents(refundedCents, 'total estornado');

  if (safeRefunded > safePaid) {
    throw new RangeError('O total estornado não pode ser maior que o total pago.');
  }

  const owedCents = sumMoneyCents([safeConsumed, safeFee]);
  const netPaidCents = safePaid - safeRefunded;

  return {
    owedCents,
    netPaidCents,
    remainingCents: Math.max(0, owedCents - netPaidCents),
    overpaidCents: Math.max(0, netPaidCents - owedCents),
  };
}

/** O cliente só controla a preferência quando a taxa estiver no modo opcional. */
export function shouldIncludeServiceFee(
  serviceFeeMode: TableServiceFeeMode,
  includeOptionalServiceFee: boolean,
) {
  if (serviceFeeMode === 'MANDATORY') {
    return true;
  }

  if (serviceFeeMode === 'OPTIONAL') {
    return includeOptionalServiceFee;
  }

  return false;
}

function isPrepaymentWindowActive(
  window: TablePrepaymentWindowDto,
  currentWeekday: number,
  currentMinute: number,
) {
  if (window.startsAtMinute < window.endsAtMinute) {
    return (
      window.weekdays.includes(currentWeekday) &&
      currentMinute >= window.startsAtMinute &&
      currentMinute < window.endsAtMinute
    );
  }

  if (window.weekdays.includes(currentWeekday) && currentMinute >= window.startsAtMinute) {
    return true;
  }

  const previousWeekday = (currentWeekday + 6) % 7;
  return window.weekdays.includes(previousWeekday) && currentMinute < window.endsAtMinute;
}

export interface PrepaymentRequirementInput {
  currentOutstandingCents: number;
  incomingOrderCents: number;
  thresholdCents: number | null;
  windows: readonly TablePrepaymentWindowDto[];
  currentWeekday: number;
  currentMinute: number;
}

/**
 * O limite incide sobre o saldo projetado depois do novo pedido. A comparação
 * é estritamente maior porque a configuração diz "acima de" determinado valor.
 */
export function requiresPrepayment({
  currentOutstandingCents,
  incomingOrderCents,
  thresholdCents,
  windows,
  currentWeekday,
  currentMinute,
}: PrepaymentRequirementInput) {
  const projectedOutstandingCents = sumMoneyCents([currentOutstandingCents, incomingOrderCents]);

  if (!Number.isInteger(currentWeekday) || currentWeekday < 0 || currentWeekday > 6) {
    throw new RangeError('O dia da semana deve estar entre 0 e 6.');
  }

  if (!Number.isInteger(currentMinute) || currentMinute < 0 || currentMinute > 1439) {
    throw new RangeError('O minuto do dia deve estar entre 0 e 1439.');
  }

  const thresholdRequiresPayment =
    thresholdCents !== null &&
    projectedOutstandingCents > assertMoneyCents(thresholdCents, 'limite de antecipação');
  const scheduleRequiresPayment = windows.some((window) =>
    isPrepaymentWindowActive(window, currentWeekday, currentMinute),
  );

  return {
    required: thresholdRequiresPayment || scheduleRequiresPayment,
    reason: scheduleRequiresPayment
      ? ('SCHEDULE' as const)
      : thresholdRequiresPayment
        ? ('THRESHOLD' as const)
        : null,
    projectedOutstandingCents,
  };
}

export function getWeekdayAndMinuteInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  if (weekday < 0 || !Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new RangeError('Não foi possível calcular o horário local do restaurante.');
  }
  return { weekday, minuteOfDay: hour * 60 + minute };
}

export function isActorFromRestaurant(actor: TableAccountActor, restaurantId: number) {
  return (
    Number.isSafeInteger(restaurantId) && restaurantId > 0 && actor.restaurantId === restaurantId
  );
}

export function canConfirmManualTablePayment(actor: TableAccountActor, restaurantId: number) {
  return (
    isActorFromRestaurant(actor, restaurantId) &&
    (actor.role === 'ADMIN' || (actor.role === 'FUNCIONARIO' && actor.subRole === 'GARCOM'))
  );
}

export function isManualTablePaymentIntent(input: {
  method: TablePaymentMethod;
  selectionMode: TablePaymentSelectionMode;
  provider: string | null;
  providerExternalId: string | null;
}) {
  return (
    (input.method === 'CASH' || input.method === 'CARD_MACHINE') &&
    !input.provider &&
    !input.providerExternalId
  );
}

export function canViewTableAccountFinancialHistory(
  actor: TableAccountActor,
  restaurantId: number,
) {
  return canConfirmManualTablePayment(actor, restaurantId);
}

export function canAuthorizePreparedItemCancellation(
  actor: TableAccountActor,
  restaurantId: number,
) {
  return (
    isActorFromRestaurant(actor, restaurantId) &&
    (actor.role === 'ADMIN' ||
      (actor.role === 'FUNCIONARIO' && (actor.subRole === 'GARCOM' || actor.subRole === 'COZINHA')))
  );
}

export function canForceCloseTableAccount(actor: TableAccountActor, restaurantId: number) {
  return isActorFromRestaurant(actor, restaurantId) && actor.role === 'ADMIN';
}

export function canRefundTablePayment(actor: TableAccountActor, restaurantId: number) {
  return isActorFromRestaurant(actor, restaurantId) && actor.role === 'ADMIN';
}

export function canFinalizeBillItemCancellation(status: TableBillItemFinancialStatus) {
  return status === 'UNPAID' || status === 'REFUNDED';
}

const PAYMENT_INTENT_TRANSITIONS: Record<
  TablePaymentIntentStatus,
  readonly TablePaymentIntentStatus[]
> = {
  RESERVED: ['PROCESSING', 'FAILED', 'EXPIRED', 'CANCELED'],
  PROCESSING: ['PAID', 'FAILED', 'EXPIRED', 'CANCELED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  EXPIRED: [],
  CANCELED: [],
  REFUNDED: [],
};

export function canTransitionTablePaymentIntent(
  currentStatus: TablePaymentIntentStatus,
  nextStatus: TablePaymentIntentStatus,
) {
  return PAYMENT_INTENT_TRANSITIONS[currentStatus].includes(nextStatus);
}
