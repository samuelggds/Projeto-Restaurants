import { z } from 'zod';

export const BRAZIL_PHONE_WITH_DDD_MESSAGE =
  'Informe DDD + número do telefone, sem DDI (ex.: 85999999999).';

export function normalizeBrazilPhone(value: unknown) {
  return String(value ?? '').replace(/\D/gu, '');
}

export function isBrazilPhoneWithDddWithoutDdi(value: unknown) {
  const digits = normalizeBrazilPhone(value);
  return /^[1-9]\d{9,10}$/u.test(digits);
}

export const brazilPhoneSchema = z
  .string({
    required_error: BRAZIL_PHONE_WITH_DDD_MESSAGE,
    invalid_type_error: BRAZIL_PHONE_WITH_DDD_MESSAGE,
  })
  .trim()
  .min(1, BRAZIL_PHONE_WITH_DDD_MESSAGE)
  .refine(isBrazilPhoneWithDddWithoutDdi, BRAZIL_PHONE_WITH_DDD_MESSAGE);

export const normalizedBrazilPhoneSchema = brazilPhoneSchema.transform(normalizeBrazilPhone);

export const optionalBrazilPhoneSchema = z.preprocess(
  (value) =>
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
      ? undefined
      : value,
  brazilPhoneSchema.optional(),
);

export const optionalNormalizedBrazilPhoneSchema = z.preprocess(
  (value) =>
    value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
      ? undefined
      : value,
  normalizedBrazilPhoneSchema.optional(),
);

export const clearableBrazilPhoneSchema = z.preprocess(
  (value) => (value === null ? '' : value),
  z.union([brazilPhoneSchema, z.literal('')]).optional(),
);
