import { z } from 'zod';

const ingredientSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, 'Nome do ingrediente é obrigatório.').max(80),
  price: z.number().min(0, 'O adicional não pode ser negativo.').max(9999),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
});

export const productOptionSchema = z
  .object({
    id: z.number().int().positive().optional(),
    ingredientId: z.number().int().positive('Ingrediente inválido.'),
    additionalPrice: z
      .number()
      .min(0, 'O preço adicional não pode ser negativo.')
      .max(9999)
      .optional(),
    pricingMode: z.enum(['ADDITIVE', 'ABSOLUTE']).default('ADDITIVE'),
    absolutePrice: z
      .number()
      .min(0, 'O preço absoluto não pode ser negativo.')
      .max(99999)
      .nullable()
      .optional(),
    allowQuantity: z.boolean().default(false),
    minQuantity: z.number().int().min(1).max(99).default(1),
    maxQuantity: z.number().int().min(1).max(99).default(1),
    defaultQuantity: z.number().int().min(1).max(99).default(1),
    defaultSelected: z.boolean().default(false),
    locked: z.boolean().default(false),
    active: z.boolean().optional(),
  })
  .superRefine((option, ctx) => {
    if (option.pricingMode === 'ABSOLUTE' && option.absolutePrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['absolutePrice'],
        message: 'Informe o preço final desta opção.',
      });
    }
    if (option.pricingMode === 'ADDITIVE' && option.absolutePrice != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['absolutePrice'],
        message: 'Preço absoluto só pode ser usado no modo de preço final.',
      });
    }
    if (option.minQuantity > option.maxQuantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minQuantity'],
        message: 'A quantidade mínima não pode superar a máxima.',
      });
    }
    if (
      option.defaultQuantity < option.minQuantity ||
      option.defaultQuantity > option.maxQuantity
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultQuantity'],
        message: 'A quantidade inicial deve ficar entre o mínimo e o máximo.',
      });
    }
    if (
      !option.allowQuantity &&
      (option.minQuantity !== 1 || option.maxQuantity !== 1 || option.defaultQuantity !== 1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowQuantity'],
        message: 'Ative quantidade para permitir mais de uma unidade desta opção.',
      });
    }
    if (option.locked && !option.defaultSelected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locked'],
        message: 'Uma opção fixa precisa vir selecionada por padrão.',
      });
    }
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
    options: z.array(productOptionSchema).min(1, 'Adicione ao menos uma opção ao grupo.').max(40),
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

    const lockedOptions = group.options.filter(
      (option) => option.active !== false && option.locked,
    ).length;
    if (lockedOptions > group.maxSelections) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'As opções fixas não podem superar o máximo de escolhas do grupo.',
      });
    }
  });

export const productCompositionItemSchema = z.object({
  id: z.number().int().positive().optional(),
  ingredientId: z.number().int().positive('Ingrediente inválido.'),
  removable: z.boolean().default(false),
  active: z.boolean().optional(),
});

export const productPortionConfigurationSchema = z
  .object({
    enabled: z.boolean().default(true),
    optionGroupName: z.string().trim().min(1).max(80),
    minPortions: z.number().int().min(1).max(8).default(1),
    maxPortions: z.number().int().min(1).max(8).default(2),
    pricingStrategy: z.enum(['ADD', 'HIGHEST', 'AVERAGE', 'PROPORTIONAL', 'FIXED']),
    allowPortionObservations: z.boolean().default(true),
  })
  .superRefine((configuration, ctx) => {
    if (configuration.minPortions > configuration.maxPortions) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minPortions'],
        message: 'O mínimo de porções não pode superar o máximo.',
      });
    }
  });

export const productConfigurationTemplateDataSchema = z
  .object({
    optionGroups: z.array(productOptionGroupSchema).max(20).default([]),
    compositionItems: z.array(productCompositionItemSchema).max(80).default([]),
    portionConfiguration: productPortionConfigurationSchema.nullable().optional(),
  })
  .superRefine((configuration, ctx) => {
    const normalizedNames = (configuration.optionGroups || []).map((group) =>
      String(group.name || '')
        .trim()
        .toLocaleLowerCase(),
    );
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['optionGroups'],
        message: 'Os grupos de opções do modelo precisam ter nomes diferentes.',
      });
    }
    if (
      configuration.portionConfiguration?.enabled &&
      !configuration.optionGroups.some(
        (group) => group.name === configuration.portionConfiguration?.optionGroupName,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['portionConfiguration', 'optionGroupName'],
        message: 'A etapa usada nas porções precisa fazer parte do modelo.',
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
    .min(0, 'Preço não pode ser negativo!'),

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

  compositionItems: z.array(productCompositionItemSchema).max(80).optional(),

  portionConfiguration: productPortionConfigurationSchema.nullable().optional(),

  templateId: z.number().int().positive().optional(),

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

  const normalizedNames = product.optionGroups.map((group) =>
    group.name.trim().toLocaleLowerCase(),
  );
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['optionGroups'],
      message: 'Os grupos de opções do produto precisam ter nomes diferentes.',
    });
  }
}

export const createProductSchema = productSchema.superRefine(validateUniqueGroupNames);
export const updateProductSchema = productSchema
  .partial()
  .extend({
    confirmDiscardConfiguration: z.boolean().optional(),
    expectedConfigurationVersion: z.number().int().positive().optional(),
  })
  .superRefine(validateUniqueGroupNames);
