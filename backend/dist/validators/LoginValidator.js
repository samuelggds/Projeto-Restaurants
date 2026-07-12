import { z } from "zod";
export const loginSchema = z.object({
    email: z.string().min(1, "Email obrigatório").email("Email inválido"),
    password: z.string().min(1, "Senha obrigatória"),
});
