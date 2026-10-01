import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Nome é obrigatório!')
    .max(50, 'Nome deve ter no máximo 50 caracteres.'),

  description: z
    .string()
    .trim()
    .max(255, 'Descrição deve ter no máximo 255 caracteres.')
    .optional(),

  image: z.string().trim().nullable().optional(),

  active: z.boolean().optional(),
});


export const reorderCategoriesSchema = z.object({
  categoryIds: z
    .array(z.number().int().positive())
    .min(1, 'Informe ao menos uma categoria.')
    .max(500, 'Quantidade de categorias inválida.')
    .superRefine((categoryIds, ctx) => {
      if (new Set(categoryIds).size !== categoryIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A lista de categorias contém itens repetidos.',
        });
      }
    }),
});
