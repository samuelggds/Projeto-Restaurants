import { z } from 'zod';

const ingredientSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, 'Nome do ingrediente é obrigatório.').max(80),
  price: z.number().min(0, 'O adicional não pode ser negativo.').max(9999),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
});

const optionSchema = z.object({
  id: z.number().int().positive().optional(),
  ingredientId: z.number().int().positive('Ingrediente inválido.'),
  active: z.boolean().optional(),
});

export const productOptionGroupSchema = z
  .object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(1, 'Nome do grupo é obrigatório.').max(80),
    description: z.string().trim().max(240).optional(),
    required: z.boolean().default(false),
    selectionType: z.enum(['SINGLE', 'MULTIPLE']),
    minSelections: z.number().int().min(0).max(40),
    maxSelections: z.number().int().min(1).max(40),
    options: z.array(optionSchema).min(1, 'Adicione ao menos uma opção ao grupo.').max(40),
  })
  .superRefine((group, ctx) => {
    if (group.minSelections > group.maxSelections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSelections'],
        message: 'O mínimo de escolhas não pode superar o máximo.',
      });
    }

    if (group.required && group.minSelections < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSelections'],
        message: 'Um grupo obrigatório deve exigir ao menos uma escolha.',
      });
    }

    if (!group.required && group.minSelections !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSelections'],
        message: 'Uma categoria opcional deve permitir continuar sem nenhuma escolha.',
      });
    }

    if (group.selectionType === 'SINGLE' && group.maxSelections !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxSelections'],
        message: 'Grupos de escolha única devem permitir exatamente uma opção.',
      });
    }

    const uniqueIngredientIds = new Set(group.options.map((option) => option.ingredientId));
    if (uniqueIngredientIds.size !== group.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Um ingrediente não pode aparecer duas vezes no mesmo grupo.',
      });
    }

    const enabledOptions = group.options.filter((option) => option.active !== false).length;
    if (enabledOptions < group.maxSelections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxSelections'],
        message: 'O máximo de escolhas não pode superar as opções ativas do grupo.',
      });
    }
  });

const productSchema = z.object({
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

  saleMode: z.enum(['COMPLETE', 'BUILDABLE']).optional(),

  ingredients: z.array(ingredientSchema).max(40).optional(),

  optionGroups: z
    .array(productOptionGroupSchema)
    .max(20, 'Cada produto pode ter no máximo 20 grupos de opções.')
    .optional(),

  categoryId: z
    .number({
      invalid_type_error: 'Categoria é obrigatória.',
      required_error: 'Categoria é obrigatória.',
    })
    .int(),
});

function validateUniqueGroupNames(
  product: { optionGroups?: Array<{ name: string }> },
  ctx: z.RefinementCtx,
) {
  if (!product.optionGroups) {
    return;
  }

  const normalizedNames = product.optionGroups.map((group) => group.name.trim().toLocaleLowerCase());
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['optionGroups'],
      message: 'Os grupos de opções do produto precisam ter nomes diferentes.',
    });
  }
}

export const createProductSchema = productSchema.superRefine(validateUniqueGroupNames);
export const updateProductSchema = productSchema.partial().superRefine(validateUniqueGroupNames);
