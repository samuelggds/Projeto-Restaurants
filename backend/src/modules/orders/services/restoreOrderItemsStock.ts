import type { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

type OrderLike = {
  restaurantId: number;
  items?: Array<{
    productId?: number | string | null;
    quantity?: number | string | null;
  }>;
};

export async function restoreOrderItemsStock(tx: TransactionClient, order: OrderLike) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const quantityByProduct = new Map<number, number>();

  for (const item of items) {
    const productId = Number(item?.productId || 0);
    const quantity = Number(item?.quantity || 0);

    if (!Number.isInteger(productId) || productId <= 0) {
      continue;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      continue;
    }

    quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantity);
  }

  for (const [productId, quantity] of quantityByProduct) {
    // Null/negative stock means unlimited and is intentionally left untouched.
    await tx.product.updateMany({
      where: {
        id: productId,
        restaurantId: Number(order.restaurantId),
        stock: { gte: 0 },
      },
      data: {
        stock: { increment: quantity },
        active: true,
      },
    });
  }
}
