import categoryRepository from "../repositories/CategoryRepository.js";
class ListCategoryService {
    async execute(restaurantId) {
        const normalizedRestaurantId = Number(restaurantId);
        if (!normalizedRestaurantId) {
            throw new Error("Restaurante não encontrado!");
        }
        const categories = await categoryRepository.findAll(normalizedRestaurantId);
        return {
            categories,
        };
    }
}
export default new ListCategoryService();
