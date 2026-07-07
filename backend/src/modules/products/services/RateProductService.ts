import productRepository from "../repositories/ProductRepository.js";

class RateProductService {
  async execute({ productId, restaurantId, clientKey, rating }) {
    const normalizedProductId = Number(productId);
    const normalizedRestaurantId = Number(restaurantId);
    const normalizedRating = Number(rating);
    const normalizedClientKey = String(clientKey || "").trim();

    if (!normalizedRestaurantId) {
      throw new Error("Restaurante não encontrado");
    }

    if (!normalizedProductId) {
      throw new Error("Produto inválido");
    }

    if (!normalizedClientKey) {
      throw new Error("Identificador do cliente não informado");
    }

    if (
      !Number.isInteger(normalizedRating) ||
      normalizedRating < 1 ||
      normalizedRating > 5
    ) {
      throw new Error("A avaliação deve ser um número inteiro entre 1 e 5");
    }

    const product = await productRepository.findById(
      normalizedProductId,
      normalizedRestaurantId,
    );

    if (!product) {
      throw new Error("Produto não encontrado para este restaurante");
    }

    await productRepository.upsertRating({
      productId: normalizedProductId,
      restaurantId: normalizedRestaurantId,
      clientKey: normalizedClientKey,
      rating: normalizedRating,
    });

    const summary = await productRepository.getRatingSummary(
      normalizedProductId,
      normalizedRestaurantId,
      normalizedClientKey,
    );

    return {
      rating: summary,
    };
  }
}

export default new RateProductService();
