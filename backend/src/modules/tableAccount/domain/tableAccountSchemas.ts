import { z } from 'zod';
import {
  DEFAULT_TABLE_ACCOUNT_TIME_ZONE,
  TABLE_ORDER_SETTLEMENT_MODES,
  TABLE_PAYMENT_METHODS,
  TABLE_PAYMENT_SELECTION_MODES,
  TABLE_SERVICE_FEE_MODES,
} from './tableAccountContracts.js';

export const moneyCentsSchema = z
  .number({ invalid_type_error: 'O valor deve ser informado em centavos inteiros.' })
  .int('O valor deve ser informado em centavos inteiros.')
  .min(0, 'O valor não pode ser negativo.')
  .max(Number.MAX_SAFE_INTEGER, 'O valor ultrapassa o limite monetário seguro.');

const publicIdSchema = z.string().uuid('Identificador público inválido.');

const reasonSchema = z
  .string()
  .trim()
  .min(5, 'Informe um motivo com pelo menos 5 caracteres.')
  .max(500, 'O motivo deve ter no máximo 500 caracteres.');

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const tableParticipantIdentityInputSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Informe um nome com pelo menos 2 caracteres.')
      .max(100, 'O nome deve ter no máximo 100 caracteres.')
      .transform((value) => value.replace(/\s+/g, ' '))
      .nullable()
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9()\s-]+$/, 'Informe um telefone válido.')
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value.length >= 10 && value.length <= 15, 'Informe um telefone válido.')
      .optional(),
  })
  .strict();

export const tableOrderContinuationInputSchema = z
  .object({
    settlementMode: z.enum(TABLE_ORDER_SETTLEMENT_MODES),
    paymentMethod: z.enum(['PIX', 'CARD']).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.settlementMode === 'PAY_NOW' && !input.paymentMethod) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'Escolha PIX ou cartão para pagar este pedido agora.',
      });
    }

    if (input.settlementMode === 'TABLE_ACCOUNT' && input.paymentMethod) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paymentMethod'],
        message: 'A forma de pagamento só deve ser informada ao pagar agora.',
      });
    }
  });

const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16, 'A chave de idempotência deve ter pelo menos 16 caracteres.')
  .max(128, 'A chave de idempotência deve ter no máximo 128 caracteres.')
  .regex(/^[A-Za-z0-9._:-]+$/, 'A chave de idempotência contém caracteres inválidos.');

export const createTablePaymentIntentInputSchema = z
  .object({
    selectionMode: z.enum(TABLE_PAYMENT_SELECTION_MODES),
    method: z.enum(TABLE_PAYMENT_METHODS),
    billItemPublicIds: z.array(publicIdSchema).min(1).max(100).optional(),
    splitCount: z.number().int().min(2).max(100).optional(),
    includeOptionalServiceFee: z.boolean().optional().default(false),
    idempotencyKey: idempotencyKeySchema,
  })
  .strict()
  .superRefine((input, context) => {
    if (
      input.billItemPublicIds &&
      new Set(input.billItemPublicIds).size !== input.billItemPublicIds.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billItemPublicIds'],
        message: 'Um mesmo item não pode ser selecionado mais de uma vez.',
      });
    }

    if (input.selectionMode === 'SELECTED_ITEMS' && !input.billItemPublicIds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billItemPublicIds'],
        message: 'Selecione ao menos um item para pagar.',
      });
    }

    if (input.selectionMode !== 'SELECTED_ITEMS' && input.billItemPublicIds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billItemPublicIds'],
        message: 'A lista de itens só pode ser enviada na opção de itens selecionados.',
      });
    }

    if (input.selectionMode === 'EQUAL_SPLIT' && !input.splitCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['splitCount'],
        message: 'Informe entre quantas pessoas o saldo será dividido.',
      });
    }

    if (input.selectionMode !== 'EQUAL_SPLIT' && input.splitCount) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['splitCount'],
        message: 'A quantidade de pessoas só pode ser enviada na divisão igual.',
      });
    }

    const isWaiterPayment = input.selectionMode === 'WAITER';
    const isManualMethod = input.method === 'CASH' || input.method === 'CARD_MACHINE';

    if (isWaiterPayment && !isManualMethod) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['method'],
        message: 'O pagamento com o garçom deve ser em dinheiro ou maquininha.',
      });
    }
  });

export const forceCloseTableAccountInputSchema = z.object({ reason: reasonSchema }).strict();

export const cancelTableBillItemInputSchema = z.object({ reason: reasonSchema }).strict();

export const refundTablePaymentInputSchema = z.object({ reason: reasonSchema }).strict();

export const tablePrepaymentWindowSchema = z
  .object({
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Escolha ao menos um dia da semana.')
      .max(7),
    startsAtMinute: z.number().int().min(0).max(1439),
    endsAtMinute: z.number().int().min(0).max(1439),
  })
  .strict()
  .superRefine((window, context) => {
    if (new Set(window.weekdays).size !== window.weekdays.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['weekdays'],
        message: 'Um dia da semana não pode ser repetido.',
      });
    }

    if (window.startsAtMinute === window.endsAtMinute) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAtMinute'],
        message: 'O início e o fim do período devem ser diferentes.',
      });
    }
  });

const tableAccountSettingsFields = {
  enabled: z.boolean(),
  requirePrepaymentAboveCents: moneyCentsSchema.nullable(),
  prepaymentWindows: z.array(tablePrepaymentWindowSchema).max(50),
  allowCash: z.boolean(),
  allowCardMachine: z.boolean(),
  allowOnlinePayment: z.boolean(),
  allowSplit: z.boolean(),
  serviceFeeMode: z.enum(TABLE_SERVICE_FEE_MODES),
  serviceFeeBasisPoints: z.number().int().min(0).max(10_000),
  preventCloseWithOutstandingBalance: z.boolean(),
  requireEmployeeApprovalForPreparedItemCancellation: z.boolean(),
  blockNewOrdersOnClosingRequest: z.boolean(),
  reservationTimeoutMinutes: z.number().int().min(1).max(60),
  timeZone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine(isValidTimeZone, 'Informe um fuso horário IANA válido.'),
};

export const tableAccountSettingsSchema = z
  .object({
    enabled: tableAccountSettingsFields.enabled.default(false),
    requirePrepaymentAboveCents:
      tableAccountSettingsFields.requirePrepaymentAboveCents.default(null),
    prepaymentWindows: tableAccountSettingsFields.prepaymentWindows.default([]),
    allowCash: tableAccountSettingsFields.allowCash.default(false),
    allowCardMachine: tableAccountSettingsFields.allowCardMachine.default(false),
    allowOnlinePayment: tableAccountSettingsFields.allowOnlinePayment.default(true),
    allowSplit: tableAccountSettingsFields.allowSplit.default(true),
    serviceFeeMode: tableAccountSettingsFields.serviceFeeMode.default('DISABLED'),
    serviceFeeBasisPoints: tableAccountSettingsFields.serviceFeeBasisPoints.default(0),
    preventCloseWithOutstandingBalance:
      tableAccountSettingsFields.preventCloseWithOutstandingBalance.default(true),
    requireEmployeeApprovalForPreparedItemCancellation:
      tableAccountSettingsFields.requireEmployeeApprovalForPreparedItemCancellation.default(true),
    blockNewOrdersOnClosingRequest:
      tableAccountSettingsFields.blockNewOrdersOnClosingRequest.default(true),
    reservationTimeoutMinutes: tableAccountSettingsFields.reservationTimeoutMinutes.default(10),
    timeZone: tableAccountSettingsFields.timeZone.default(DEFAULT_TABLE_ACCOUNT_TIME_ZONE),
  })
  .strict()
  .superRefine((settings, context) => {
    if (settings.serviceFeeMode === 'DISABLED' && settings.serviceFeeBasisPoints !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serviceFeeBasisPoints'],
        message: 'A taxa deve ser zero quando a cobrança estiver desativada.',
      });
    }

    if (settings.serviceFeeMode !== 'DISABLED' && settings.serviceFeeBasisPoints === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['serviceFeeBasisPoints'],
        message: 'Informe o percentual da taxa de serviço.',
      });
    }
  });

/**
 * Payload de PATCH sem defaults. O serviço deve mesclá-lo ao registro atual e
 * validar o resultado final com tableAccountSettingsSchema antes de persistir.
 */
export const tableAccountSettingsPatchSchema = z
  .object(tableAccountSettingsFields)
  .partial()
  .strict();

export type TableParticipantIdentityInput = z.infer<typeof tableParticipantIdentityInputSchema>;
export type TableOrderContinuationInput = z.infer<typeof tableOrderContinuationInputSchema>;
export type CreateTablePaymentIntentInput = z.infer<typeof createTablePaymentIntentInputSchema>;
export type ForceCloseTableAccountInput = z.infer<typeof forceCloseTableAccountInputSchema>;
export type CancelTableBillItemInput = z.infer<typeof cancelTableBillItemInputSchema>;
export type RefundTablePaymentInput = z.infer<typeof refundTablePaymentInputSchema>;
export type TableAccountSettingsInput = z.infer<typeof tableAccountSettingsSchema>;
export type TableAccountSettingsPatchInput = z.infer<typeof tableAccountSettingsPatchSchema>;
