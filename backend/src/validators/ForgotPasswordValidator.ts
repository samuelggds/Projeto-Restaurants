import { z } from 'zod';
import { passwordSchema } from './PasswordValidator.js';

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email('Email invalido').optional(),
    phone: z.string().trim().min(8, 'Telefone invalido').optional(),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Informe e-mail ou telefone',
    path: ['email'],
  });

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email('Email invalido').optional(),
    phone: z.string().trim().min(8, 'Telefone invalido').optional(),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Codigo invalido'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: 'Informe e-mail ou telefone',
    path: ['email'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });
