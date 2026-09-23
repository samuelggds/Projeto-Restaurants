import { z } from 'zod';
import { passwordSchema } from './PasswordValidator.js';

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Nome obrigatório'),

    email: z.string().min(1, 'Email obrigatório').email('Email inválido'),

    phone: z
      .string()
      .trim()
      .min(10, 'Telefone inválido')
      .max(20, 'Telefone inválido')
      .refine((value) => {
        const digits = value.replace(/\D/gu, '');
        return /^(?:55)?\d{10,11}$/u.test(digits);
      }, 'Telefone inválido'),

    restaurantSlug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, 'Restaurante inválido')
      .optional(),

    password: passwordSchema,

    confirmPassword: z.string().min(1, 'Confirmação de senha obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem!',
    path: ['confirmPassword'],
  });
