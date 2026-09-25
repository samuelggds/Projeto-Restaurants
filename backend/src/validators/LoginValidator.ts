import { z } from 'zod';

const staffUsernameSchema = z
  .string()
  .trim()
  .min(3, 'Usuário obrigatório')
  .max(32, 'Usuário inválido')
  .transform((value) => value.normalize('NFC').toLocaleLowerCase('pt-BR'))
  .refine((value) => /^[\\p{Ll}\\p{N}]+$/u.test(value), {
    message: 'Usuário inválido',
  });

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Email inválido').optional(),
    username: staffUsernameSchema.optional(),
    restaurantSlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Restaurante inválido')
      .optional(),
    password: z.string().min(1, 'Senha obrigatória'),
  })
  .superRefine((data, ctx) => {
    if (data.username) {
      if (!data.restaurantSlug) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['restaurantSlug'],
          message: 'Restaurante obrigatório para acesso da equipe',
        });
      }
      return;
    }
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email obrigatório',
      });
    }
  });
