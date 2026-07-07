import categoryRepository from "../repositories/CategoryRepository.js";
import { createCategorySchema } from "../../../validators/CategoryValidator.js";

class CreateCategoryService {
  async execute(data, restaurantId) {
    if (!restaurantId) {
      throw new Error("Restaurante não encontrado");
    }

    const parsed = createCategorySchema.parse(data);
    const normalizedName = String(parsed.name || "").trim();

    const existingCategory = await categoryRepository.findByName(
      normalizedName,
      restaurantId,
    );

    if (existingCategory) {
      throw new Error("Já existe uma categoria com esse nome.");
    }

    const category = await categoryRepository.create(
      {
        ...parsed,
        name: normalizedName,
      },
      restaurantId,
    );

    return {
      category,
    };
  }
}

export default new CreateCategoryService();
