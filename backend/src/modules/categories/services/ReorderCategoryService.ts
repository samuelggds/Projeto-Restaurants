import { z } from 'zod';
import categoryRepository from '../repositories/CategoryRepository.js';
import { reorderCategoriesSchema } from '../../../validators/CategoryValidator.js';

type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

class ReorderCategoryService {
  async execute(data: ReorderCategoriesInput, restaurantId: number | string) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante não encontrado!');
    }

    const parsed = reorderCategoriesSchema.parse(data);
    const categories = await categoryRepository.reorder(
      parsed.categoryIds,
      normalizedRestaurantId,
    );

    return { categories };
  }
}

export default new ReorderCategoryService();
