import categoryRepository from "../repositories/CategoryRepository.js";

class ListCategoryService {
  async execute(restaurantId) {
    if (!restaurantId) {
      throw new Error("Restaurante não encontrado!");
    }
    const categories = await categoryRepository.findAll(restaurantId);
    return {
      categories,
    };
  }
}

export default new ListCategoryService();
