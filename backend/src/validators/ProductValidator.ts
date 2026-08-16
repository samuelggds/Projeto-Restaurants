import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório!'),

  description: z.string().trim().optional(),

  image: z.string().trim().optional(),

  price: z
    .number({
      invalid_type_error: 'Preço deve ser um número.',
      required_error: 'Preço deve ser um número.',
    })
    .positive('Preço deve ser maior que zero!'),

  active: z.boolean().optional(),

  featured: z.boolean().optional(),

  preparationTime: z
    .number()
    .int('Tempo deve ser inteiro.')
    .positive('Tempo deve ser maior que zero.')
    .optional(),

  stock: z
    .number()
    .int('Estoque deve ser inteiro.')
    .min(0, 'Estoque não pode ser negativo.')
    .nullable()
    .optional(),

  categoryId: z
    .number({
      invalid_type_error: 'Categoria é obrigatória.',
      required_error: 'Categoria é obrigatória.',
    })
    .int(),
});
