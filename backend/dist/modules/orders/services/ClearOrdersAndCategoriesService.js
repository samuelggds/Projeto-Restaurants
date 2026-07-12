import prisma from "../../../config/prisma.js";
import categoryRepository from "../../categories/repositories/CategoryRepository.js";
import orderRepository from "../repositories/OrderRepository.js";
class ClearOrdersAndCategoriesService {
    async execute(restaurantId) {
        const normalizedRestaurantId = Number(restaurantId);
        if (!Number.isFinite(normalizedRestaurantId) ||
            normalizedRestaurantId <= 0) {
            throw new Error("Restaurant inválido!");
        }
        await prisma.$transaction(async (db) => {
            await orderRepository.deleteAllByRestaurant(normalizedRestaurantId, db);
            await categoryRepository.deleteAllByRestaurant(normalizedRestaurantId, db);
        });
    }
}
export default new ClearOrdersAndCategoriesService();
