import categoryRepository from "../repositories/CategoryRepository.js";

class DeleteCategoryService {
  async execute(id: number | string, restaurantId: number | string) {
    const normalizedRestaurantId = Number(restaurantId);

    const category = await categoryRepository.findById(
      id,
      normalizedRestaurantId,
    );

    if (!category) {
      throw new Error("Categoria não encontrada!");
    }

    await categoryRepository.delete(id, normalizedRestaurantId);
  }
}

export default new DeleteCategoryService();
