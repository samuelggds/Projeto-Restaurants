import categoryRepository from "../repositories/CategoryRepository.js";
import { createCategorySchema } from "../../../validators/CategoryValidator.js";

class UpdateCategoryService {
  async execute(id, data, restaurantId) {
    const parsedData = createCategorySchema.partial().parse(data);

    const category = await categoryRepository.findById(id, restaurantId);

    if (!category) {
      throw new Error("Categoria não encontrada!");
    }

    const hasNameUpdate = Object.prototype.hasOwnProperty.call(
      parsedData,
      "name",
    );

    if (hasNameUpdate) {
      const normalizedName = String(parsedData.name || "").trim();

      if (!normalizedName) {
        throw new Error("Nome da categoria inválido.");
      }

      const existingCategory = await categoryRepository.findByName(
        normalizedName,
        restaurantId,
      );

      if (existingCategory && Number(existingCategory.id) !== Number(id)) {
        throw new Error("Já existe uma categoria com esse nome.");
      }

      parsedData.name = normalizedName;
    }

    return categoryRepository.update(id, parsedData, restaurantId);
  }
}

export default new UpdateCategoryService();
