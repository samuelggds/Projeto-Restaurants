import { z } from 'zod';

const text = (minimum: number, maximum: number) => z.string().trim().min(minimum).max(maximum);
export const salesLeadStatusSchema = z.enum(['NEW', 'CONTACTED', 'ARCHIVED']);
export const salesLeadIdSchema = z.string().uuid('Identificador de solicitação inválido.');

export const createSalesLeadSchema = z
  .object({
    name: text(2, 120),
    restaurantName: text(2, 160),
    email: z.string().trim().toLowerCase().max(254).email('Informe um e-mail válido.'),
    phone: z
      .string()
      .trim()
      .max(32)
      .regex(/^[+\d() .-]+$/u)
      .transform((value) => value.replace(/\D/gu, ''))
      .pipe(z.string().min(10, 'Informe um telefone com DDD.').max(15)),
    city: text(2, 100),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/u, 'Informe a UF com duas letras.'),
    businessType: text(2, 80),
    channels: z
      .array(z.enum(['DELIVERY', 'TABLE', 'PICKUP']))
      .min(1)
      .max(3)
      .transform((values) => [...new Set(values)].sort()),
    planInterest: z.enum(['BASICO', 'PREMIUM', 'UNDECIDED']),
    message: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((value) => value || null),
    consent: z.literal(true, { errorMap: () => ({ message: 'Autorize o contato para enviar.' }) }),
    website: z.string().max(200).optional(),
  })
  .strict();

export const listSalesLeadsSchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    status: salesLeadStatusSchema.optional(),
    q: z.string().trim().max(120).default(''),
  })
  .strict();

export const updateSalesLeadSchema = z.object({ status: salesLeadStatusSchema }).strict();
export type CreateSalesLeadInput = z.infer<typeof createSalesLeadSchema>;

export class SalesLeadError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'SalesLeadError';
  }
}

export function parseSalesLeadInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new SalesLeadError(result.error.issues[0]?.message || 'Dados de contato inválidos.');
  }
  return result.data;
}
