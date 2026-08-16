import productRepository from '../repositories/ProductRepository.js';
import { createProductSchema } from '../../../validators/ProductValidator.js';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

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

    const payload: Omit<Prisma.ProductUncheckedCreateInput, 'restaurantId'> = {
      ...parsedData,
      name: requiredName,
      price: requiredPrice,
      categoryId: requiredCategoryId,
      active: activeFromStock,
    };

    const product = await productRepository.create(payload, restaurantId);

    return {
      product,
    };
  }
}

export default new CreateProductService();
