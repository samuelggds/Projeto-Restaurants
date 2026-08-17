import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'hotmali.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'gmil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'yahho.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
};

function normalizePhone(value: string) {
  return String(value || '')
    .replace(/\D/g, '')
    .trim();
}

function validateEmailDomainTypos(value: string) {
  const domain = String(value || '')
    .split('@')[1]
    ?.trim()
    .toLowerCase();

  if (!domain) {
    return { valid: true };
  }

  const suggestion = COMMON_EMAIL_DOMAIN_TYPOS[domain];

  if (!suggestion) {
    return { valid: true };
  }

  return {
    valid: false,
    message: `Domínio de email inválido (${domain}). Você quis dizer ${suggestion}?`,
  };
}

export const createRestaurantSchema = z.object({
  plan: z.enum(['BASICO', 'PREMIUM'], {
    errorMap: () => ({ message: 'Escolha o plano Básico ou Premium.' }),
  }),
  restaurant: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome do restaurante deve ter no mínimo 2 caracteres!')
      .max(120, 'Nome do restaurante muito longo!'),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, 'Slug deve ter no mínimo 3 caracteres!')
      .max(60, 'Slug muito longo!')
      .regex(slugPattern, 'Slug inválido! Use apenas letras minúsculas, números e hífen.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Email do restaurante inválido!')
      .superRefine((value, context) => {
        const result = validateEmailDomainTypos(value);

        if (!result.valid) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.message,
          });
        }
      }),

    phone: z
      .string()
      .optional()
      .transform((value) => normalizePhone(value || ''))
      .refine((value) => !value || /^\d{10,11}$/.test(value), 'Telefone do restaurante inválido!'),
    whatsapp: z.string().optional(),

    cnpj: z.string().optional(),

    logo: z.string().optional(),
    coverImage: z.string().optional(),
    description: z.string().optional(),

    address: z.string().trim().optional(),
    city: z
      .string()
      .trim()
      .optional()
      .refine((value) => !value || value.length >= 2, 'Cidade deve ter no mínimo 2 caracteres!'),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .refine(
        (value) => !value || /^[A-Z]{2}$/.test(value),
        'Estado deve conter exatamente 2 letras.',
      ),
    zipCode: z.string().optional(),

    openingHours: z.string().optional(),
  }),

  admin: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome do admin deve ter no mínimo 2 caracteres!')
      .max(120, 'Nome do admin muito longo!'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Email do admin inválido!')
      .superRefine((value, context) => {
        const result = validateEmailDomainTypos(value);

        if (!result.valid) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.message,
          });
        }
      }),
    password: z
      .string()
      .min(6, 'Senha deve ter no mínimo 6 caracteres!')
      .max(72, 'Senha muito longa!'),
  }),
});
