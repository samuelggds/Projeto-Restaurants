import productRepository from "../repositories/ProductRepository.js";
import restaurantRepository from "../../restaurants/repositories/RestaurantRepository.js";

type ListProductsPayload = {
  restaurantId?: number | string | null;
  slug?: string;
};

class ListProductsService {
  async execute({ restaurantId, slug }: ListProductsPayload) {
    let normalizedRestaurantId = Number(restaurantId);

    if (
      (!Number.isInteger(normalizedRestaurantId) ||
        normalizedRestaurantId <= 0) &&
      slug
    ) {
      const restaurant = await restaurantRepository.findBySlug(
        String(slug).trim(),
      );
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }

    if (!normalizedRestaurantId) {
      throw new Error("Restaurante não encontrado");
    }

    const products = await productRepository.findAll(normalizedRestaurantId);

    return {
      products,
      count: products.length,
    };
  }
}

export default new ListProductsService();
