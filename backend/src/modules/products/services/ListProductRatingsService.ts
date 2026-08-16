import productRepository from '../repositories/ProductRepository.js';

class ListProductRatingsService {
  async execute(restaurantId: number | string, clientKey?: string) {
    const normalizedRestaurantId = Number(restaurantId);

    if (!normalizedRestaurantId) {
      throw new Error('Restaurante não encontrado');
    }

    const ratings = await productRepository.listRatingsByRestaurant(
      normalizedRestaurantId,
      String(clientKey || '').trim(),
    );

    return {
      ratings,
      count: ratings.length,
    };
  }
}

export default new ListProductRatingsService();
