import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Email invalido"),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Email invalido"),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Codigo invalido"),
    newPassword: z
      .string()
      .min(6, "A nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"],
  });
