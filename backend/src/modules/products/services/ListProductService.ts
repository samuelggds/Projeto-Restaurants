import productRepository from '../repositories/ProductRepository.js';
import restaurantRepository from '../../restaurants/repositories/RestaurantRepository.js';
import { resolveProductBasePricing } from '../utils/productDiscount.js';
import { createPublicMediaReference } from '../../publicMedia/utils/publicMediaReference.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';

type ListProductsPayload = {
  restaurantId?: number | string | null;
  slug?: string;
};

function presentIngredientImage<
  T extends { id: number; image?: string | null; updatedAt?: Date | null },
>(ingredient: T, restaurantId: number) {
  return {
    ...ingredient,
    image: createPublicMediaReference(
      ingredient.image,
      `/public-media/restaurants/${restaurantId}/ingredients/${ingredient.id}`,
      ingredient.updatedAt,
    ),
  };
}

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

    const products = await withTenantDbContext(normalizedRestaurantId, (db) =>
      productRepository.findAll(normalizedRestaurantId, db),
    );

    const normalizedProducts = products.map((product) => {
      const stockValue =
        product?.stock === null || product?.stock === undefined ? null : Number(product.stock);

      const pricing = resolveProductBasePricing(product);
      const publicImage = createPublicMediaReference(
        product.image,
        `/public-media/restaurants/${normalizedRestaurantId}/products/${product.id}`,
        product.updatedAt,
      );
      const publicIngredients = product.ingredients.map((ingredient) =>
        presentIngredientImage(ingredient, normalizedRestaurantId),
      );
      const publicCompositionItems = product.compositionItems.map((item) => ({
        ...item,
        ingredient: presentIngredientImage(item.ingredient, normalizedRestaurantId),
      }));
      const publicOptionGroups = product.optionGroups.map((group) => ({
        ...group,
        options: group.options.map((option) => ({
          ...option,
          ingredient: presentIngredientImage(option.ingredient, normalizedRestaurantId),
        })),
      }));

      if (Number.isFinite(stockValue) && stockValue <= 0) {
        return {
          ...product,
          image: publicImage,
          ingredients: publicIngredients,
          compositionItems: publicCompositionItems,
          optionGroups: publicOptionGroups,
          active: false,
          pricing,
        };
      }

      return {
        ...product,
        image: publicImage,
        ingredients: publicIngredients,
        compositionItems: publicCompositionItems,
        optionGroups: publicOptionGroups,
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
