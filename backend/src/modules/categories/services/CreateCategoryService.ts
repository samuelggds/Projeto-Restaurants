import categoryRepository from '../repositories/CategoryRepository.js';
import { createCategorySchema } from '../../../validators/CategoryValidator.js';
import { z } from 'zod';

type CreateCategoryInput = z.infer<typeof createCategorySchema>;

class CreateCategoryService {
  async execute(data: CreateCategoryInput, restaurantId: number | string) {
    const normalizedRestaurantId = Number(restaurantId);

    if (!normalizedRestaurantId) {
      throw new Error('Restaurante não encontrado');
    }

    const parsed = createCategorySchema.parse(data);
    const normalizedName = String(parsed.name || '').trim();

    const existingCategory = await categoryRepository.findByName(
      normalizedName,
      normalizedRestaurantId,
    );

    if (existingCategory) {
      throw new Error('Já existe uma categoria com esse nome.');
    }

    const category = await categoryRepository.create(
      {
        ...parsed,
        name: normalizedName,
      },
      normalizedRestaurantId,
    );

    return {
      category,
    };
  }
}

export default new CreateCategoryService();
