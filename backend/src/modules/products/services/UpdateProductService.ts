import { updateProductSchema } from '../../../validators/ProductValidator.js';
import productRepository from '../repositories/ProductRepository.js';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { buildProductOptionGroupsCreate } from '../utils/productOptionGroups.js';

type UpdateProductInput = z.infer<typeof updateProductSchema>;

class UpdateProductService {
  async execute(id: number | string, data: UpdateProductInput, restaurantId: number) {
    const parsedData = updateProductSchema.parse(data);

    const product = await productRepository.findById(id, restaurantId);

    if (!product) {
      throw new Error('Produto não encontrado!');
    }

    const stockWasProvided = Object.prototype.hasOwnProperty.call(data, 'stock');
    const normalizedStock =
      parsedData.stock === null || parsedData.stock === undefined ? null : Number(parsedData.stock);

    let nextActive = parsedData.active;

    if (stockWasProvided) {
      nextActive = normalizedStock === null || normalizedStock > 0;
    }

    const payload: UpdateProductInput = {
      ...parsedData,
      active: nextActive,
    };
    const {
      ingredients: _legacyIngredients,
      optionGroups,
      saleMode: _saleMode,
      ...productData
    } = payload;
    if (optionGroups && optionGroups.length === 0) {
      throw new Error('Adicione ao menos um grupo de opções para montar o produto.');
    }

    return prisma.$transaction(async (tx) => {
      if (productData.categoryId !== undefined) {
        const category = await tx.category.findFirst({
          where: { id: productData.categoryId, restaurantId },
          select: { id: true },
        });

        if (!category) {
          throw new Error('A categoria informada não pertence a este restaurante.');
        }
      }

      const normalizedGroups = optionGroups
        ? await buildProductOptionGroupsCreate(tx, restaurantId, optionGroups)
        : null;

      if (normalizedGroups) {
        await tx.productOptionGroup.deleteMany({ where: { productId: product.id, restaurantId } });
      }

      return tx.product.update({
        where: { id: product.id },
        data: {
          ...productData,
          saleMode: 'BUILDABLE',
          ...(normalizedGroups
            ? { optionGroups: { create: normalizedGroups } }
            : {}),
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
  }
}

export default new UpdateProductService();
