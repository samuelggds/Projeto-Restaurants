import categoryRepository from "../repositories/CategoryRepository.js";

class DeleteCategoryService {
  async execute(id, restaurantId) {
    const category = await categoryRepository.findById(id, restaurantId);

    if (!category) {
      throw new Error("Categoria não encontrada!");
    }

    await categoryRepository.delete(id, restaurantId);
  }
}

export default new DeleteCategoryService();
