import { z } from 'zod/v3';

const nullableMoneySchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.union([z.coerce.number().positive('O limite de desconto deve ser maior que zero.'), z.null()]),
);

const nullableDateSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.union([z.null(), z.coerce.date()]),
);

const booleanSchema = z.preprocess((value) => {
  if (value === 'false' || value === 0 || value === '0') return false;
  if (value === 'true' || value === 1 || value === '1') return true;
  return value;
}, z.boolean());

export const couponCodeSchema = z
  .string({ required_error: 'Informe o código do cupom.' })
  .trim()
  .min(3, 'O código deve ter pelo menos 3 caracteres.')
  .max(40, 'O código deve ter no máximo 40 caracteres.')
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-Z0-9][A-Z0-9_-]*$/.test(value),
    'Use apenas letras, números, hífen ou sublinhado no código.',
  );

const nullableUsageLimitSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.union([z.null(), z.coerce.number().int().min(1).max(1000000)]),
);

const couponKindSchema = z.enum(['PROMOTIONAL', 'LOYALTY']);
const couponAudienceSchema = z.enum(['ALL', 'AUTHENTICATED', 'NEW_CUSTOMERS', 'RETURNING_CUSTOMERS', 'INACTIVE_CUSTOMERS', 'SPECIFIC_CUSTOMERS']);

const couponFields = {
  kind: couponKindSchema,
  audience: couponAudienceSchema,
  inactivityMonths: z.number().int().min(1).max(36).nullable(),
  recipientUserIds: z.array(z.number().int().positive()).max(200),
  usageLimit: nullableUsageLimitSchema,
  allowDelivery: booleanSchema,
  allowPickup: booleanSchema,
  allowTable: booleanSchema,
  code: couponCodeSchema,
  title: z.string().trim().max(80, 'O título deve ter no máximo 80 caracteres.').optional(),
  description: z
    .string()
    .trim()
    .max(300, 'A descrição deve ter no máximo 300 caracteres.')
    .optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE', 'FREE_SHIPPING']),
  discount: z.coerce.number().min(0, 'O desconto não pode ser negativo.'),
  minimumSubtotal: z.coerce.number().min(0, 'O pedido mínimo não pode ser negativo.'),
  maxDiscount: nullableMoneySchema,
  loyaltyPurchasesRequired: z.coerce
    .number()
    .int('A quantidade de compras deve ser um número inteiro.')
    .min(1, 'Exija pelo menos uma compra para liberar o cupom.')
    .max(1000, 'A quantidade máxima é de 1000 compras.'),
  perCustomerLimit: z.coerce
    .number()
    .int('O limite por cliente deve ser um número inteiro.')
    .min(1, 'Permita pelo menos um cupom guardado por cliente.')
    .max(100, 'O limite máximo é de 100 cupons guardados por cliente.'),
  redemptionValidityDays: z.coerce
    .number()
    .int('A validade da recompensa deve ser informada em dias inteiros.')
    .min(1, 'A recompensa deve ficar válida por pelo menos um dia.')
    .max(365, 'A validade máxima da recompensa é de 365 dias.'),
  active: booleanSchema,
  expiration: nullableDateSchema,
};

function validateCouponChannels(
  payload: object,
  context: z.RefinementCtx,
) {
  const settings = payload as Record<string, unknown>;
  if (settings.allowDelivery === false && settings.allowPickup === false && settings.allowTable === false) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowDelivery'],
      message: 'Habilite pelo menos uma modalidade para o cupom.',
    });
  }
}

function validateCouponRules(
  payload: {
    kind?: 'PROMOTIONAL' | 'LOYALTY';
    audience?: 'ALL' | 'AUTHENTICATED' | 'NEW_CUSTOMERS' | 'RETURNING_CUSTOMERS' | 'INACTIVE_CUSTOMERS' | 'SPECIFIC_CUSTOMERS';
    inactivityMonths?: number | null;
    recipientUserIds?: number[];
    discount?: number;
    discountType?: 'FIXED' | 'PERCENTAGE' | 'FREE_SHIPPING';
    allowDelivery?: boolean;
    allowPickup?: boolean;
    allowTable?: boolean;
  },
  context: z.RefinementCtx,
) {
  validateCouponChannels(payload, context);
  if (payload.audience === 'INACTIVE_CUSTOMERS' && !(Number.isInteger(payload.inactivityMonths) && (payload.inactivityMonths || 0) >= 1 && (payload.inactivityMonths || 0) <= 36)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['inactivityMonths'], message: 'Informe entre 1 e 36 meses de inatividade.' });
  if (payload.audience === 'SPECIFIC_CUSTOMERS' && !payload.recipientUserIds?.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['recipientUserIds'], message: 'Selecione pelo menos um cliente cadastrado.' });
  if (payload.audience !== 'INACTIVE_CUSTOMERS' && payload.inactivityMonths != null) context.addIssue({ code: z.ZodIssueCode.custom, path: ['inactivityMonths'], message: 'Meses só são permitidos para clientes inativos.' });
  const { discount, discountType, kind, audience } = payload;
  if (discountType === 'PERCENTAGE' && discount !== undefined && discount >= 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount'],
      message: 'O desconto percentual deve ser menor que 100%.',
    });
  }
  if (discountType === 'FREE_SHIPPING') {
    if (kind === 'LOYALTY') {
      context.addIssue({
        code: z.ZodIssueCode.custom, path: ['discountType'],
        message: 'Frete grátis está disponível apenas para cupons promocionais.',
      });
    }
    if (discount !== undefined && discount !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom, path: ['discount'],
        message: 'Frete grátis não pode descontar valores dos produtos.',
      });
    }
    if (payload.allowDelivery === false || payload.allowPickup === true || payload.allowTable === true) {
      context.addIssue({
        code: z.ZodIssueCode.custom, path: ['allowDelivery'],
        message: 'Frete grátis está disponível exclusivamente em Delivery.',
      });
    }
  } else if (discount !== undefined && discount <= 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom, path: ['discount'],
      message: 'Informe um desconto maior que zero.',
    });
  }
  if (audience && audience !== 'ALL' && kind === 'LOYALTY') {
    context.addIssue({
      code: z.ZodIssueCode.custom, path: ['audience'],
      message: 'Público-alvo de primeira compra é exclusivo para cupons promocionais.',
    });
  }
}

export const createCouponSchema = z
  .object({
    ...couponFields,
    kind: couponFields.kind.default('LOYALTY'),
    audience: couponFields.audience.default('ALL'),
    inactivityMonths: couponFields.inactivityMonths.default(null),
    recipientUserIds: couponFields.recipientUserIds.default([]),
    usageLimit: couponFields.usageLimit.default(null),
    allowDelivery: couponFields.allowDelivery.default(true),
    allowPickup: couponFields.allowPickup.default(true),
    allowTable: couponFields.allowTable.default(true),
    title: couponFields.title.default(''),
    description: couponFields.description.default(''),
    discountType: couponFields.discountType.default('FIXED'),
    minimumSubtotal: couponFields.minimumSubtotal.default(0),
    maxDiscount: couponFields.maxDiscount.default(null),
    loyaltyPurchasesRequired: couponFields.loyaltyPurchasesRequired.default(1),
    perCustomerLimit: couponFields.perCustomerLimit.default(1),
    redemptionValidityDays: couponFields.redemptionValidityDays.default(30),
    active: couponFields.active.default(true),
    expiration: couponFields.expiration.default(null),
  })
  .superRefine(validateCouponRules);

export const updateCouponSchema = z
  .object({
    code: couponFields.code.optional(),
    kind: couponFields.kind.optional(),
    audience: couponFields.audience.optional(),
    inactivityMonths: couponFields.inactivityMonths.optional(),
    recipientUserIds: couponFields.recipientUserIds.optional(),
    usageLimit: couponFields.usageLimit.optional(),
    allowDelivery: couponFields.allowDelivery.optional(),
    allowPickup: couponFields.allowPickup.optional(),
    allowTable: couponFields.allowTable.optional(),
    title: couponFields.title,
    description: couponFields.description,
    discountType: couponFields.discountType.optional(),
    discount: couponFields.discount.optional(),
    minimumSubtotal: couponFields.minimumSubtotal.optional(),
    maxDiscount: couponFields.maxDiscount.optional(),
    loyaltyPurchasesRequired: couponFields.loyaltyPurchasesRequired.optional(),
    perCustomerLimit: couponFields.perCustomerLimit.optional(),
    redemptionValidityDays: couponFields.redemptionValidityDays.optional(),
    active: couponFields.active.optional(),
    expiration: couponFields.expiration.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Informe ao menos um campo para atualizar o cupom.',
  })
  .superRefine(validateCouponRules);

export const couponIdSchema = z.coerce.number().int('Cupom inválido.').positive('Cupom inválido.');

export const loyaltyRestaurantQuerySchema = z.object({
  restaurantId: z.coerce
    .number({ required_error: 'Informe o restaurante.' })
    .int('Restaurante inválido.')
    .positive('Restaurante inválido.'),
});

export function couponValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || 'Confira os dados do cupom e tente novamente.';
}
