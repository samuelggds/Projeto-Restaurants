import prisma from '../../../config/prisma.js';
import { upsertProductDiscountSchema } from '../../../validators/ProductDiscountValidator.js';

class UpsertProductDiscountService {
  async execute({
    productId,
    restaurantId,
    input,
  }: {
    productId: number | string;
    restaurantId: number | string | null;
    input: unknown;
  }) {
    const normalizedProductId = Number(productId);
    const normalizedRestaurantId = Number(restaurantId || 0);
    if (!Number.isInteger(normalizedProductId) || normalizedProductId <= 0) {
      throw new Error('Produto inválido.');
    }
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido.');
    }

    const data = upsertProductDiscountSchema.parse(input);
    const product = await prisma.product.findFirst({
      where: { id: normalizedProductId, restaurantId: normalizedRestaurantId },
      select: { id: true, price: true },
    });
    if (!product) {
      throw new Error('Produto não encontrado neste restaurante.');
    }
    if (data.kind === 'FIXED' && data.value >= Number(product.price)) {
      throw new Error('O desconto fixo deve ser menor que o preço-base do produto.');
    }

    return prisma.productDiscount.upsert({
      where: { productId: normalizedProductId, restaurantId: normalizedRestaurantId },
      update: {
        kind: data.kind,
        value: data.value,
        label: data.label || null,
        active: data.active,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
      create: {
        restaurantId: normalizedRestaurantId,
        productId: normalizedProductId,
        kind: data.kind,
        value: data.value,
        label: data.label || null,
        active: data.active,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
      },
    });
  }
}

export default new UpsertProductDiscountService();
