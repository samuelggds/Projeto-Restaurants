import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_TABLE_ACCOUNT_TIME_ZONE,
  TABLE_ACCOUNT_PAYMENT_PROVIDER,
  TABLE_ACCOUNT_PRODUCT_DECISIONS,
  TABLE_PAYMENT_INTENT_STATUSES,
  type TableAccountActor,
  type TablePaymentIntentStatus,
} from './tableAccountContracts.js';
import {
  cancelTableBillItemInputSchema,
  createTablePaymentIntentInputSchema,
  moneyCentsSchema,
  tableAccountSettingsPatchSchema,
  tableAccountSettingsSchema,
  tableOrderContinuationInputSchema,
  tableParticipantIdentityInputSchema,
  tablePrepaymentWindowSchema,
} from './tableAccountSchemas.js';
import {
  assertMoneyCents,
  calculateServiceFeeCents,
  calculateTableAccountBalance,
  canAuthorizePreparedItemCancellation,
  canConfirmManualTablePayment,
  canFinalizeBillItemCancellation,
  canForceCloseTableAccount,
  canRefundTablePayment,
  canTransitionTablePaymentIntent,
  requiresPrepayment,
  shouldIncludeServiceFee,
  splitCentsEqually,
  sumMoneyCents,
} from './tableAccountRules.js';

const itemId = '123e4567-e89b-42d3-a456-426614174000';

test('aceita somente valores monetários inteiros, não negativos e seguros', () => {
  assert.equal(moneyCentsSchema.parse(1_099), 1_099);
  assert.equal(assertMoneyCents(0), 0);
  assert.throws(() => moneyCentsSchema.parse('1099'));
  assert.throws(() => assertMoneyCents(-1));
  assert.throws(() => assertMoneyCents(10.5));
  assert.throws(() => assertMoneyCents(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => sumMoneyCents([Number.MAX_SAFE_INTEGER, 1]), /limite monetário/i);
});

test('divide centavos exatamente e entrega o resto às primeiras partes', () => {
  const parts = splitCentsEqually(100, 3);

  assert.deepEqual(parts, [34, 33, 33]);
  assert.equal(sumMoneyCents(parts), 100);
  assert.deepEqual(splitCentsEqually(4, 4), [1, 1, 1, 1]);
  assert.throws(() => splitCentsEqually(100, 0), /partes/i);
  assert.throws(() => splitCentsEqually(100, 101), /partes/i);
  assert.throws(() => splitCentsEqually(2, 4), /partes/i);
});

test('calcula taxa de serviço em basis points sem ponto flutuante', () => {
  assert.equal(calculateServiceFeeCents(1_005, 1_000), 101);
  assert.equal(calculateServiceFeeCents(1_000, 1_000), 100);
  assert.equal(calculateServiceFeeCents(999, 0), 0);
  assert.throws(() => calculateServiceFeeCents(1_000, 10_001), /basis points/i);
});

test('calcula saldo sem número negativo e expõe pagamento a maior', () => {
  assert.deepEqual(
    calculateTableAccountBalance({
      consumedCents: 10_000,
      serviceFeeCents: 1_000,
      grossPaidCents: 4_000,
      refundedCents: 500,
    }),
    {
      owedCents: 11_000,
      netPaidCents: 3_500,
      remainingCents: 7_500,
      overpaidCents: 0,
    },
  );

  assert.deepEqual(
    calculateTableAccountBalance({
      consumedCents: 1_000,
      serviceFeeCents: 0,
      grossPaidCents: 1_100,
      refundedCents: 0,
    }),
    {
      owedCents: 1_000,
      netPaidCents: 1_100,
      remainingCents: 0,
      overpaidCents: 100,
    },
  );

  assert.throws(
    () =>
      calculateTableAccountBalance({
        consumedCents: 1_000,
        serviceFeeCents: 0,
        grossPaidCents: 100,
        refundedCents: 101,
      }),
    /estornado/i,
  );
});

test('exige antecipação pelo saldo projetado somente quando ultrapassa o limite', () => {
  assert.deepEqual(
    requiresPrepayment({
      currentOutstandingCents: 4_000,
      incomingOrderCents: 1_000,
      thresholdCents: 5_000,
      windows: [],
      currentWeekday: 1,
      currentMinute: 720,
    }),
    { required: false, reason: null, projectedOutstandingCents: 5_000 },
  );

  assert.deepEqual(
    requiresPrepayment({
      currentOutstandingCents: 4_000,
      incomingOrderCents: 1_001,
      thresholdCents: 5_000,
      windows: [],
      currentWeekday: 1,
      currentMinute: 720,
    }),
    { required: true, reason: 'THRESHOLD', projectedOutstandingCents: 5_001 },
  );
});

test('reconhece janelas de antecipação comuns e que atravessam a meia-noite', () => {
  const overnightWindow = [{ weekdays: [5], startsAtMinute: 1_320, endsAtMinute: 120 }];

  assert.equal(
    requiresPrepayment({
      currentOutstandingCents: 0,
      incomingOrderCents: 500,
      thresholdCents: null,
      windows: overnightWindow,
      currentWeekday: 5,
      currentMinute: 1_380,
    }).reason,
    'SCHEDULE',
  );
  assert.equal(
    requiresPrepayment({
      currentOutstandingCents: 0,
      incomingOrderCents: 500,
      thresholdCents: null,
      windows: overnightWindow,
      currentWeekday: 6,
      currentMinute: 60,
    }).reason,
    'SCHEDULE',
  );
  assert.equal(
    requiresPrepayment({
      currentOutstandingCents: 0,
      incomingOrderCents: 500,
      thresholdCents: null,
      windows: overnightWindow,
      currentWeekday: 6,
      currentMinute: 180,
    }).required,
    false,
  );
});

test('normaliza identidade do participante e mantém telefone opcional', () => {
  assert.deepEqual(tableParticipantIdentityInputSchema.parse({ displayName: '  Ana   Silva  ' }), {
    displayName: 'Ana Silva',
  });
  assert.deepEqual(
    tableParticipantIdentityInputSchema.parse({
      displayName: 'Ana',
      phone: '(85) 99999-9999',
    }),
    { displayName: 'Ana', phone: '85999999999' },
  );
  assert.equal(
    tableParticipantIdentityInputSchema.safeParse({
      displayName: 'Ana',
      restaurantId: 99,
    }).success,
    false,
  );
});

test('valida a decisão entre conta da mesa e pagamento imediato', () => {
  assert.equal(
    tableOrderContinuationInputSchema.safeParse({ settlementMode: 'TABLE_ACCOUNT' }).success,
    true,
  );
  assert.equal(
    tableOrderContinuationInputSchema.safeParse({
      settlementMode: 'PAY_NOW',
      paymentMethod: 'PIX',
    }).success,
    true,
  );
  assert.equal(
    tableOrderContinuationInputSchema.safeParse({ settlementMode: 'PAY_NOW' }).success,
    false,
  );
  assert.equal(
    tableOrderContinuationInputSchema.safeParse({
      settlementMode: 'TABLE_ACCOUNT',
      paymentMethod: 'CARD',
    }).success,
    false,
  );
});

test('aceita seleção de itens segura e rejeita totais ou restaurantId do cliente', () => {
  const validInput = {
    selectionMode: 'SELECTED_ITEMS',
    method: 'PIX',
    billItemPublicIds: [itemId],
    includeOptionalServiceFee: true,
    idempotencyKey: 'table-payment:request-0001',
  };

  assert.equal(createTablePaymentIntentInputSchema.safeParse(validInput).success, true);
  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...validInput,
      restaurantId: 10,
      amountCents: 1,
    }).success,
    false,
  );
  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...validInput,
      billItemPublicIds: [itemId, itemId],
    }).success,
    false,
  );
  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...validInput,
      idempotencyKey: 'curta',
    }).success,
    false,
  );
});

test('separa divisão igual e pagamento presencial das outras escolhas', () => {
  const base = { idempotencyKey: 'table-payment:request-0002' };

  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...base,
      selectionMode: 'EQUAL_SPLIT',
      method: 'CARD',
      splitCount: 4,
    }).success,
    true,
  );
  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...base,
      selectionMode: 'EQUAL_SPLIT',
      method: 'CARD',
    }).success,
    false,
  );
  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...base,
      selectionMode: 'WAITER',
      method: 'CARD_MACHINE',
    }).success,
    true,
  );
  assert.equal(
    createTablePaymentIntentInputSchema.safeParse({
      ...base,
      selectionMode: 'MY_ITEMS',
      method: 'CASH',
    }).success,
    false,
  );
});

test('aplica padrões seguros às configurações e não escolhe provedor', () => {
  const settings = tableAccountSettingsSchema.parse({});

  assert.equal(settings.enabled, false);
  assert.equal(settings.preventCloseWithOutstandingBalance, true);
  assert.equal(settings.blockNewOrdersOnClosingRequest, true);
  assert.equal(settings.timeZone, DEFAULT_TABLE_ACCOUNT_TIME_ZONE);
  assert.equal(TABLE_ACCOUNT_PAYMENT_PROVIDER, null);
  assert.equal(TABLE_ACCOUNT_PRODUCT_DECISIONS.selectedPaymentProvider, null);
  assert.equal(
    tableAccountSettingsSchema.safeParse({ timeZone: 'Fuso/Inexistente' }).success,
    false,
  );
  assert.deepEqual(tableAccountSettingsPatchSchema.parse({ allowCash: true }), {
    allowCash: true,
  });
});

test('rejeita configuração incoerente e motivo insuficiente', () => {
  assert.equal(
    tableAccountSettingsSchema.safeParse({
      serviceFeeMode: 'DISABLED',
      serviceFeeBasisPoints: 1_000,
    }).success,
    false,
  );
  assert.equal(
    tableAccountSettingsSchema.safeParse({
      serviceFeeMode: 'OPTIONAL',
      serviceFeeBasisPoints: 0,
    }).success,
    false,
  );
  assert.equal(
    tablePrepaymentWindowSchema.safeParse({
      weekdays: [1, 1],
      startsAtMinute: 600,
      endsAtMinute: 600,
    }).success,
    false,
  );
  assert.equal(cancelTableBillItemInputSchema.safeParse({ reason: 'não' }).success, false);
});

test('mantém taxa obrigatória sob autoridade do backend', () => {
  assert.equal(shouldIncludeServiceFee('DISABLED', true), false);
  assert.equal(shouldIncludeServiceFee('OPTIONAL', false), false);
  assert.equal(shouldIncludeServiceFee('OPTIONAL', true), true);
  assert.equal(shouldIncludeServiceFee('MANDATORY', false), true);
});

test('limita confirmação manual ao admin e ao garçom do restaurante', () => {
  const admin: TableAccountActor = {
    id: 1,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 10,
  };
  const waiter: TableAccountActor = {
    id: 2,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
    restaurantId: 10,
  };
  const kitchen: TableAccountActor = {
    id: 3,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 10,
  };
  const superAdmin: TableAccountActor = {
    id: 4,
    role: 'SUPER_ADMIN',
    subRole: null,
    restaurantId: null,
  };

  assert.equal(canConfirmManualTablePayment(admin, 10), true);
  assert.equal(canConfirmManualTablePayment(waiter, 10), true);
  assert.equal(canConfirmManualTablePayment(waiter, 11), false);
  assert.equal(canConfirmManualTablePayment(kitchen, 10), false);
  assert.equal(canConfirmManualTablePayment(superAdmin, 10), false);
  assert.equal(canAuthorizePreparedItemCancellation(kitchen, 10), true);
  assert.equal(canAuthorizePreparedItemCancellation(kitchen, 11), false);
  assert.equal(canForceCloseTableAccount(admin, 10), true);
  assert.equal(canForceCloseTableAccount(admin, 11), false);
  assert.equal(canForceCloseTableAccount(waiter, 10), false);
  assert.equal(canRefundTablePayment(admin, 10), true);
  assert.equal(canRefundTablePayment(superAdmin, 10), false);
});

test('só finaliza cancelamento financeiro seguro e controla transições de pagamento', () => {
  assert.equal(canFinalizeBillItemCancellation('UNPAID'), true);
  assert.equal(canFinalizeBillItemCancellation('REFUNDED'), true);
  assert.equal(canFinalizeBillItemCancellation('RESERVED'), false);
  assert.equal(canFinalizeBillItemCancellation('PROCESSING'), false);
  assert.equal(canFinalizeBillItemCancellation('PAID'), false);

  assert.equal(canTransitionTablePaymentIntent('RESERVED', 'PROCESSING'), true);
  assert.equal(canTransitionTablePaymentIntent('PROCESSING', 'PAID'), true);
  assert.equal(canTransitionTablePaymentIntent('PROCESSING', 'EXPIRED'), false);
  assert.equal(canTransitionTablePaymentIntent('PAID', 'REFUNDED'), true);
  assert.equal(canTransitionTablePaymentIntent('PAID', 'FAILED'), false);
  assert.equal(canTransitionTablePaymentIntent('REFUNDED', 'PAID'), false);
});

test('mantém fechada a matriz completa de transições do pagamento', () => {
  const allowedTransitions: Record<TablePaymentIntentStatus, readonly TablePaymentIntentStatus[]> =
    {
      RESERVED: ['PROCESSING', 'EXPIRED', 'CANCELED'],
      PROCESSING: ['PAID', 'FAILED'],
      PAID: ['REFUNDED'],
      FAILED: [],
      EXPIRED: [],
      CANCELED: [],
      REFUNDED: [],
    };

  for (const currentStatus of TABLE_PAYMENT_INTENT_STATUSES) {
    for (const nextStatus of TABLE_PAYMENT_INTENT_STATUSES) {
      assert.equal(
        canTransitionTablePaymentIntent(currentStatus, nextStatus),
        allowedTransitions[currentStatus].includes(nextStatus),
        `${currentStatus} -> ${nextStatus}`,
      );
    }
  }
});
