import { FuncionarioSubRole, UserRole } from '@prisma/client';
import { z } from 'zod';
import { passwordSchema } from './PasswordValidator.js';

const phoneRegex =
  /^(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\s?-?\s?(\d{4}))$/;

const employeeNameSchema = z
  .string()
  .trim()
  .min(2, 'Nome deve conter pelo menos 2 caracteres')
  .max(120, 'Nome deve conter no máximo 120 caracteres');

const employeeEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Email inválido')
  .max(180, 'Email deve conter no máximo 180 caracteres');

const employeePhoneSchema = z
  .string({
    required_error: 'Telefone obrigatório',
    invalid_type_error: 'Telefone inválido',
  })
  .trim()
  .min(1, 'Telefone obrigatório')
  .regex(phoneRegex, 'Número de telefone inválido!');

export const EmployeeUserSchema = z
  .object({
    name: employeeNameSchema,
    email: employeeEmailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirmação de senha obrigatória'),
    role: z
      .nativeEnum(UserRole)
      .optional()
      .refine(
        (value) => !value || value === UserRole.FUNCIONARIO || value === UserRole.MOTOQUEIRO,
        {
          message: 'Cargo inválido',
        },
      ),
    phone: employeePhoneSchema,
    subRole: z.nativeEnum(FuncionarioSubRole).optional().nullable(),
    cpf: z
      .string()
      .optional()
      .refine(
        (value) =>
          !value ||
          /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(
            value.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4'),
          ),
        { message: 'CPF inválido' },
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem!',
    path: ['confirmPassword'],
  });

export const UpdateEmployeeSchema = z
  .object({
    name: employeeNameSchema.optional(),
    email: employeeEmailSchema.optional(),
    phone: z.union([employeePhoneSchema, z.literal(''), z.null()]).optional(),
    role: z
      .nativeEnum(UserRole)
      .optional()
      .refine(
        (value) => !value || value === UserRole.FUNCIONARIO || value === UserRole.MOTOQUEIRO,
        { message: 'Cargo inválido' },
      ),
    subRole: z.nativeEnum(FuncionarioSubRole).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Informe ao menos um dado para atualizar',
  });

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});
