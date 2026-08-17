import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Nome obrigatório'),

    email: z.string().min(1, 'Email obrigatório').email('Email inválido'),

    password: z.string().min(6, 'Senha deve conter no mínimo 6 caracteres!'),

    confirmPassword: z.string().min(1, 'Confirmação de senha obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem!',
    path: ['confirmPassword'],
  });
