import type { Prisma, ProductOptionSelectionType } from '@prisma/client';
import type { z } from 'zod';
import type { productOptionGroupSchema } from '../../../validators/ProductValidator.js';

type ProductOptionGroupInput = z.infer<typeof productOptionGroupSchema>;
type PrismaClientLike = Prisma.TransactionClient;

export async function buildProductOptionGroupsCreate(
  tx: PrismaClientLike,
  restaurantId: number,
  groups: ProductOptionGroupInput[],
) {
  const ingredientIds = [
    ...new Set(groups.flatMap((group) => group.options.map((option) => option.ingredientId))),
  ];

  const ingredients = ingredientIds.length
    ? await tx.ingredient.findMany({
        where: {
          restaurantId,
          id: { in: ingredientIds },
        },
        select: { id: true },
      })
    : [];

  if (ingredients.length !== ingredientIds.length) {
    throw new Error('Um ou mais ingredientes não pertencem a este restaurante.');
  }

  return groups.map((group, groupIndex) => ({
    restaurantId,
    name: group.name.trim(),
    description: String(group.description || '').trim() || null,
    required: group.required,
    selectionType: group.selectionType as ProductOptionSelectionType,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    position: groupIndex,
    active: true,
    options: {
      create: group.options.map((option, optionIndex) => ({
        ingredientId: option.ingredientId,
        active: option.active !== false,
        position: optionIndex,
      })),
    },
  }));
}
