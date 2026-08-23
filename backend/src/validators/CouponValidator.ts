import { z } from 'zod';

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

const couponFields = {
  code: couponCodeSchema,
  title: z.string().trim().max(80, 'O título deve ter no máximo 80 caracteres.').optional(),
  description: z
    .string()
    .trim()
    .max(300, 'A descrição deve ter no máximo 300 caracteres.')
    .optional(),
  discountType: z.enum(['FIXED', 'PERCENTAGE']),
  discount: z.coerce.number().positive('Informe um desconto maior que zero.'),
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

function validatePercentage(
  payload: { discount?: number; discountType?: 'FIXED' | 'PERCENTAGE' },
  context: z.RefinementCtx,
) {
  if (payload.discountType === 'PERCENTAGE' && Number(payload.discount) >= 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['discount'],
      message: 'O desconto percentual deve ser menor que 100%.',
    });
  }
}

export const createCouponSchema = z
  .object({
    ...couponFields,
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
  .superRefine(validatePercentage);

export const updateCouponSchema = z
  .object({
    code: couponFields.code.optional(),
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
  .superRefine(validatePercentage);

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
