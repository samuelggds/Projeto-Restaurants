import categoryRepository from "../repositories/CategoryRepository.js";
import { createCategorySchema } from "../../../validators/CategoryValidator.js";
import { z } from "zod";

type UpdateCategoryInput = Partial<z.infer<typeof createCategorySchema>>;

class UpdateCategoryService {
  async execute(
    id: number | string,
    data: UpdateCategoryInput,
    restaurantId: number | string,
  ) {
    const normalizedRestaurantId = Number(restaurantId);
    const parsedData = createCategorySchema.partial().parse(data);

    const category = await categoryRepository.findById(
      id,
      normalizedRestaurantId,
    );

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
        normalizedRestaurantId,
      );

      if (existingCategory && Number(existingCategory.id) !== Number(id)) {
        throw new Error("Já existe uma categoria com esse nome.");
      }

      parsedData.name = normalizedName;
    }

    return categoryRepository.update(id, parsedData, normalizedRestaurantId);
  }
}

export default new UpdateCategoryService();
