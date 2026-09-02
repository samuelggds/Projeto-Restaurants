import prisma from '../../../config/prisma.js';

class PublicMediaRepository {
  async findRestaurantImage(restaurantId: number, kind: 'logo' | 'cover') {
    const select =
      kind === 'logo'
        ? { logo: true as const, updatedAt: true as const }
        : { coverImage: true as const, updatedAt: true as const };

    return prisma.restaurant.findFirst({
      where: { id: restaurantId, active: true },
      select,
    });
  }

  async findBannerImage(restaurantId: number, bannerId: number) {
    return prisma.banner.findFirst({
      where: {
        id: bannerId,
        restaurantId,
        active: true,
        restaurant: { active: true },
      },
      select: {
        image: true,
        updatedAt: true,
      },
    });
  }

  async findProductImage(restaurantId: number, productId: number) {
    return prisma.product.findFirst({
      where: {
        id: productId,
        restaurantId,
        restaurant: { active: true },
      },
      select: {
        image: true,
        updatedAt: true,
      },
    });
  }

  async findIngredientImage(restaurantId: number, ingredientId: number) {
    return prisma.ingredient.findFirst({
      where: {
        id: ingredientId,
        restaurantId,
        restaurant: { active: true },
      },
      select: {
        image: true,
        updatedAt: true,
      },
    });
  }
}

export default new PublicMediaRepository();
