import prisma from '../../../config/prisma.js';

class DeleteProductDiscountService {
  async execute(productId: number | string, restaurantId: number | string | null) {
    const normalizedProductId = Number(productId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      throw new Error('Produto inválido.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const product = await prisma.product.findFirst({
      where: { id: normalizedProductId, restaurantId: normalizedRestaurantId },
      select: { id: true },
    });
    if (!product) {
      throw new Error('Produto não encontrado neste restaurante.');
    }

    await prisma.productDiscount.deleteMany({
      where: { productId: normalizedProductId, restaurantId: normalizedRestaurantId },
    });

    return { message: 'Desconto removido com sucesso.' };
  }
}

export default new DeleteProductDiscountService();

