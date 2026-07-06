import categoryRepository from "../repositories/CategoryRepository.js";
import { createCategorySchema } from "../../../validators/CategoryValidator.js";

class UpdateCategoryService {
  async execute(id, data, restaurantId) {
    createCategorySchema.partial().parse(data);

    const category = await categoryRepository.findById(id, restaurantId);

    if (!category) {
      throw new Error("Categoria não encontrada!");
    }

    return categoryRepository.update(id, data, restaurantId);
  }
}

export default new UpdateCategoryService();
