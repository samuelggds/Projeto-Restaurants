import { z } from 'zod';

export const BRAZIL_PHONE_WITH_DDD_MESSAGE =
  'Informe DDD + número; o +55 é opcional (ex.: 85999999999 ou +5585999999999).';

function phoneDigits(value: unknown) {
  return String(value ?? '').replace(/\D/gu, '');
}

export function normalizeBrazilPhone(value: unknown) {
  const digits = phoneDigits(value);

  // Mantém a representação nacional já usada pelo banco e evita duplicidade
  // entre 85... e +55 85... para o mesmo telefone brasileiro.
  return /^55[1-9]\d{9,10}$/u.test(digits) ? digits.slice(2) : digits;
}

export function isBrazilPhoneWithOptionalDdi(value: unknown) {
  return /^[1-9]\d{9,10}$/u.test(normalizeBrazilPhone(value));
}

/**
 * Compatibilidade com imports antigos. O nome histórico dizia "sem DDI",
 * mas a regra atual aceita DDD+número ou +55+DDD+número.
 */
export const isBrazilPhoneWithDddWithoutDdi = isBrazilPhoneWithOptionalDdi;

export const brazilPhoneSchema = z
  .string({
    required_error: BRAZIL_PHONE_WITH_DDD_MESSAGE,
    invalid_type_error: BRAZIL_PHONE_WITH_DDD_MESSAGE,
  })
  .trim()
  .min(1, BRAZIL_PHONE_WITH_DDD_MESSAGE)
  .refine(isBrazilPhoneWithOptionalDdi, BRAZIL_PHONE_WITH_DDD_MESSAGE);

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
