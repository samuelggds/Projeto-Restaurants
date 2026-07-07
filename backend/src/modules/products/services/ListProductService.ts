import productRepository from "../repositories/ProductRepository.js";

class ListProductsService {
  async execute(restaurantId: number | string) {
    const normalizedRestaurantId = Number(restaurantId);

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
