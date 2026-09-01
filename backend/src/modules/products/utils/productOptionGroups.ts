import type { Prisma, ProductOptionSelectionType } from '@prisma/client';
import type { z } from 'zod';
import type {
  productCompositionItemSchema,
  productOptionGroupSchema,
} from '../../../validators/ProductValidator.js';

type ProductOptionGroupInput = z.infer<typeof productOptionGroupSchema>;
type ProductCompositionItemInput = z.infer<typeof productCompositionItemSchema>;
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
        select: { id: true, price: true },
      })
    : [];

  if (ingredients.length !== ingredientIds.length) {
    throw new Error('Um ou mais ingredientes não pertencem a este restaurante.');
  }

  const ingredientPrices = new Map(
    ingredients.map((ingredient) => [ingredient.id, Number(ingredient.price)]),
  );

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
        restaurantId,
        ingredientId: option.ingredientId,
        additionalPrice: option.additionalPrice ?? ingredientPrices.get(option.ingredientId) ?? 0,
        pricingMode: option.pricingMode,
        absolutePrice: option.pricingMode === 'ABSOLUTE' ? option.absolutePrice : null,
        allowQuantity: option.allowQuantity,
        minQuantity: option.minQuantity,
        maxQuantity: option.maxQuantity,
        defaultQuantity: option.defaultQuantity,
        defaultSelected: option.defaultSelected,
        locked: option.locked,
        active: option.active !== false,
        position: optionIndex,
      })),
    },
  }));
}

export async function buildProductCompositionCreate(
  tx: PrismaClientLike,
  restaurantId: number,
  items: ProductCompositionItemInput[],
) {
  const ingredientIds = [...new Set(items.map((item) => item.ingredientId))];
  if (ingredientIds.length !== items.length) {
    throw new Error('Um ingrediente não pode aparecer duas vezes na composição padrão.');
  }

  const ingredients = ingredientIds.length
    ? await tx.ingredient.findMany({
        where: { restaurantId, id: { in: ingredientIds } },
        select: { id: true },
      })
    : [];
  if (ingredients.length !== ingredientIds.length) {
    throw new Error('Um ou mais ingredientes da composição não pertencem a este restaurante.');
  }

  return items.map((item, position) => ({
    restaurantId,
    ingredientId: item.ingredientId,
    removable: item.removable,
    active: item.active !== false,
    position,
  }));
}
