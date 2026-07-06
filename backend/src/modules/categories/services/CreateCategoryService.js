import categoryRepository from "../repositories/CategoryRepository.js";
import { createCategorySchema } from "../../../validators/CategoryValidator.js";

class CreateCategoryService {
  async execute(data, restaurantId) {
    if (!restaurantId) {
      throw new Error("Restaurante não encontrado");
    }

    createCategorySchema.parse(data);

    const category = await categoryRepository.create(data, restaurantId);

    return {
      category,
    };
  }
}

export default new CreateCategoryService();
