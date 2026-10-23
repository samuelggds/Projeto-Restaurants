import { z } from 'zod';

const optionalDate = z
  .union([z.string().datetime({ offset: true }), z.date(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined) return null;
    return value instanceof Date ? value : new Date(value);
  });

export const upsertProductDiscountSchema = z
  .object({
    kind: z.enum(['FIXED', 'PERCENTAGE']),
    value: z.coerce.number().positive('Informe um desconto maior que zero.').max(999999),
    label: z.string().trim().max(40, 'O aviso pode ter no máximo 40 caracteres.').optional(),
    active: z.boolean().optional().default(true),
    startsAt: optionalDate,
    endsAt: optionalDate,
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'PERCENTAGE' && data.value >= 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['value'],
        message: 'O desconto percentual deve ser menor que 100%.',
      });
    }

    if (data.startsAt && data.endsAt && data.startsAt >= data.endsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endsAt'],
        message: 'O término da oferta deve ser posterior ao início.',
      });
    }
  });
