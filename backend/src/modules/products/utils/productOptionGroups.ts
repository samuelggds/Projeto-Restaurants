import type { Prisma, ProductOptionSelectionType } from '@prisma/client';
import type { z } from 'zod';
import type {
  productCompositionItemSchema,
  productOptionGroupSchema,
} from '../../../validators/ProductValidator.js';

type ProductOptionGroupInput = z.infer<typeof productOptionGroupSchema>;
type ProductCompositionItemInput = z.infer<typeof productCompositionItemSchema>;
type PrismaClientLike = Prisma.TransactionClient;

type ProductOptionGroupNestedCreate = Omit<
  Prisma.ProductOptionGroupUncheckedCreateWithoutProductInput,
  'options'
> & {
  options: {
    create: Prisma.ProductOptionUncheckedCreateWithoutGroupInput[];
  };
};

export async function buildProductOptionGroupsCreate(
  tx: PrismaClientLike,
  restaurantId: number,
  groups: ProductOptionGroupInput[],
): Promise<ProductOptionGroupNestedCreate[]> {
  const ingredientIds = [
    ...new Set(
      groups.flatMap((group) =>
        group.options.flatMap((option) => (option.ingredientId ? [option.ingredientId] : [])),
      ),
    ),
  ];
  const referenceProductIds = [
    ...new Set(
      groups.flatMap((group) =>
        group.options.flatMap((option) =>
          option.referenceProductId ? [option.referenceProductId] : [],
        ),
      ),
    ),
  ];

  const [ingredients, referenceProducts] = await Promise.all([
    ingredientIds.length
      ? tx.ingredient.findMany({
          where: { restaurantId, id: { in: ingredientIds } },
          select: { id: true, price: true },
        })
      : [],
    referenceProductIds.length
      ? tx.product.findMany({
          where: {
            restaurantId,
            id: { in: referenceProductIds },
            active: true,
            kind: 'STANDARD',
            pricingMode: 'BASE',
          },
          select: { id: true, price: true },
        })
      : [],
  ]);

  if (ingredients.length !== ingredientIds.length) {
    throw new Error('Um ou mais ingredientes não pertencem a este restaurante.');
  }
  if (referenceProducts.length !== referenceProductIds.length) {
    throw new Error('Um ou mais produtos do meio a meio estão indisponíveis neste restaurante.');
  }

  const ingredientPrices = new Map<number, number>(
    ingredients.map((ingredient) => [ingredient.id, Number(ingredient.price)] as const),
  );

  return groups.map(
    (group, groupIndex) =>
      ({
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
            ingredientId: option.ingredientId ?? null,
            referenceProductId: option.referenceProductId ?? null,
            additionalPrice: option.referenceProductId
              ? 0
              : (option.additionalPrice ?? ingredientPrices.get(option.ingredientId || 0) ?? 0),
            pricingMode: option.referenceProductId ? 'ABSOLUTE' : option.pricingMode,
            absolutePrice: option.referenceProductId
              ? 0
              : option.pricingMode === 'ABSOLUTE'
                ? option.absolutePrice
                : null,
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
      }) satisfies ProductOptionGroupNestedCreate,
  );
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
    ingredientId: item.ingredientId,
    removable: item.removable,
    active: item.active !== false,
    position,
  }));
}
