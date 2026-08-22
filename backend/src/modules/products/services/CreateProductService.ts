import { createProductSchema } from '../../../validators/ProductValidator.js';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { buildProductOptionGroupsCreate } from '../utils/productOptionGroups.js';

type CreateProductInput = z.infer<typeof createProductSchema>;

function requireDefined<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value as NonNullable<T>;
}

class CreateProductService {
  async execute(data: CreateProductInput, restaurantId: number) {
    if (!restaurantId) {
      throw new Error('Restaurante não encontrado');
    }

    const parsedData = createProductSchema.parse(data);

    const normalizedStock =
      parsedData.stock === null || parsedData.stock === undefined ? null : Number(parsedData.stock);
    const activeFromStock = normalizedStock === null || normalizedStock > 0;

    const requiredName = requireDefined(parsedData.name, 'Nome do produto é obrigatório.');
    const requiredPrice = requireDefined(parsedData.price, 'Preço do produto é obrigatório.');
    const requiredCategoryId = requireDefined(
      parsedData.categoryId,
      'Categoria do produto é obrigatória.',
    );

    const { ingredients: _legacyIngredients, optionGroups = [], saleMode: _saleMode, ...productData } =
      parsedData;
    if (optionGroups.length === 0) {
      throw new Error('Adicione ao menos um grupo de opções para montar o produto.');
    }

    const product = await prisma.$transaction(async (tx) => {
      const category = await tx.category.findFirst({
        where: { id: requiredCategoryId, restaurantId },
        select: { id: true },
      });

      if (!category) {
        throw new Error('A categoria informada não pertence a este restaurante.');
      }

      const normalizedGroups = await buildProductOptionGroupsCreate(
        tx,
        restaurantId,
        optionGroups,
      );

      return tx.product.create({
        data: {
          ...productData,
          name: requiredName,
          price: requiredPrice,
          categoryId: requiredCategoryId,
          restaurantId,
          saleMode: 'BUILDABLE',
          active: activeFromStock && parsedData.active !== false,
          optionGroups: { create: normalizedGroups },
        },
        include: {
          category: true,
          optionGroups: {
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: {
              options: {
                orderBy: [{ position: 'asc' }, { id: 'asc' }],
                include: { ingredient: true },
              },
            },
          },
        },
      });
    });

    return {
      product,
    };
  }
}

export default new CreateProductService();
