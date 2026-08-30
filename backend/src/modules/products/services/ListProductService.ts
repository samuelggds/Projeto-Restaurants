import productRepository from '../repositories/ProductRepository.js';
import restaurantRepository from '../../restaurants/repositories/RestaurantRepository.js';
import { resolveProductBasePricing } from '../utils/productDiscount.js';
import { createPublicMediaReference } from '../../publicMedia/utils/publicMediaReference.js';

type ListProductsPayload = {
  restaurantId?: number | string | null;
  slug?: string;
};

class ListProductsService {
  async execute({ restaurantId, slug }: ListProductsPayload) {
    let normalizedRestaurantId = Number(restaurantId);

    if ((!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) && slug) {
      const restaurant = await restaurantRepository.findBySlug(String(slug).trim());
      normalizedRestaurantId = Number(restaurant?.id || 0);
    }

    if (!normalizedRestaurantId) {
      throw new Error('Restaurante não encontrado');
    }

    const products = await productRepository.findAll(normalizedRestaurantId);

    const normalizedProducts = products.map((product) => {
      const stockValue =
        product?.stock === null || product?.stock === undefined ? null : Number(product.stock);

      const pricing = resolveProductBasePricing(product);
      const publicImage = createPublicMediaReference(
        product.image,
        `/public-media/restaurants/${normalizedRestaurantId}/products/${product.id}`,
        product.updatedAt,
      );

      if (Number.isFinite(stockValue) && stockValue <= 0) {
        return {
          ...product,
          image: publicImage,
          active: false,
          pricing,
        };
      }

      return {
        ...product,
        image: publicImage,
        pricing,
      };
    });

    return {
      products: normalizedProducts,
      count: normalizedProducts.length,
    };
  }
}

export default new ListProductsService();
