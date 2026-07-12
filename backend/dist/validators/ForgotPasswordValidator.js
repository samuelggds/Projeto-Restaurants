import { z } from "zod";
export const forgotPasswordSchema = z
    .object({
    email: z.string().trim().email("Email invalido").optional(),
    phone: z.string().trim().min(8, "Telefone invalido").optional(),
})
    .refine((data) => Boolean(data.email || data.phone), {
    message: "Informe e-mail ou telefone",
    path: ["email"],
});
export const resetPasswordSchema = z
    .object({
    email: z.string().trim().email("Email invalido").optional(),
    phone: z.string().trim().min(8, "Telefone invalido").optional(),
    code: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "Codigo invalido"),
    newPassword: z
        .string()
        .min(6, "A nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirme a nova senha"),
})
    .refine((data) => Boolean(data.email || data.phone), {
    message: "Informe e-mail ou telefone",
    path: ["email"],
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"],
});
