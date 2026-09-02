import { z } from 'zod';
import { normalizeIngredientImageUpload } from '../modules/ingredients/images/ingredientImageSecurity.js';

const ingredientImageSchema = z
  .union([z.string(), z.null()])
  .transform((value) => normalizeIngredientImageUpload(value));

export const createIngredientSchema = z.object({
  name: z.string().trim().min(1, 'Nome do ingrediente é obrigatório.').max(80),
  category: z
    .string({
      invalid_type_error: 'A categoria do ingrediente deve ser um texto.',
      required_error: 'Categoria do ingrediente é obrigatória.',
    })
    .trim()
    .min(1, 'Categoria do ingrediente é obrigatória.')
    .max(60, 'A categoria deve ter no máximo 60 caracteres.'),
  price: z
    .number({
      invalid_type_error: 'O valor adicional deve ser um número.',
      required_error: 'O valor adicional é obrigatório.',
    })
    .min(0, 'O valor adicional não pode ser negativo.')
    .max(99999, 'O valor adicional informado é muito alto.'),
  active: z.boolean().optional(),
  image: ingredientImageSchema.optional(),
  imageSelectionToken: z.string().trim().min(1).max(4_096).optional(),
});

export const updateIngredientSchema = createIngredientSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Informe ao menos um campo para atualizar.');
