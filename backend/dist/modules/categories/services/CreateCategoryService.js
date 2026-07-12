import categoryRepository from "../repositories/CategoryRepository.js";
import { createCategorySchema } from "../../../validators/CategoryValidator.js";
class CreateCategoryService {
    async execute(data, restaurantId) {
        const normalizedRestaurantId = Number(restaurantId);
        if (!normalizedRestaurantId) {
            throw new Error("Restaurante não encontrado");
        }
        const parsed = createCategorySchema.parse(data);
        const normalizedName = String(parsed.name || "").trim();
        const existingCategory = await categoryRepository.findByName(normalizedName, normalizedRestaurantId);
        if (existingCategory) {
            throw new Error("Já existe uma categoria com esse nome.");
        }
        const category = await categoryRepository.create({
            ...parsed,
            name: normalizedName,
        }, normalizedRestaurantId);
        return {
            category,
        };
    }
}
export default new CreateCategoryService();
