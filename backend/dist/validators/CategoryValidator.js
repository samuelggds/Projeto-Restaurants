import { z } from "zod";
export const createCategorySchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Nome é obrigatório!")
        .max(50, "Nome deve ter no máximo 50 caracteres."),
    description: z
        .string()
        .trim()
        .max(255, "Descrição deve ter no máximo 255 caracteres.")
        .optional(),
    image: z.string().trim().optional(),
    active: z.boolean().optional(),
});
