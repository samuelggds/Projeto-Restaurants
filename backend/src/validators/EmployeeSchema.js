import { UserRole } from "@prisma/client";
import { z } from "zod";

const phoneRegex =
  /^(?:\+?55\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\s?-?\s?(\d{4}))$/;

export const EmployeeUserSchema = z
  .object({
    name: z.string().min(1, "Nome obrigatório"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve conter no mínimo 6 caracteres!"),
    confirmPassword: z.string().min(6, "Confirmação de senha obrigatória"),
    role: z
      .nativeEnum(UserRole)
      .optional()
      .refine(
        (value) =>
          !value || [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO].includes(value),
        {
          message: "Cargo inválido",
        },
      ),
    phone: z
      .string()
      .min(1, "Telefone obrigatório")
      .regex(phoneRegex, "Número de telefone inválido!"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não conferem!",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});
