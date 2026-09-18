import type { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

type OrderLike = {
  restaurantId: number;
  items?: Array<{
    productId?: number | string | null;
    quantity?: number | string | null;
    configurationSnapshot?: unknown;
  }>;
};

export async function restoreOrderItemsStock(tx: TransactionClient, order: OrderLike) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const quantityByProduct = new Map<number, number>();

  for (const item of items) {
    const quantity = Number(item?.quantity || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) continue;

    const snapshot =
      item?.configurationSnapshot && typeof item.configurationSnapshot === 'object'
        ? (item.configurationSnapshot as {
            kind?: string;
            comboComponents?: Array<{ productId?: number; quantity?: number }>;
          })
        : null;

    if (snapshot?.kind === 'COMBO') {
      for (const component of snapshot.comboComponents || []) {
        const componentProductId = Number(component.productId || 0);
        const perCombo = Number(component.quantity || 0);
        if (
          !Number.isInteger(componentProductId) ||
          componentProductId <= 0 ||
          !Number.isInteger(perCombo) ||
          perCombo <= 0
        ) {
          continue;
        }
        quantityByProduct.set(
          componentProductId,
          (quantityByProduct.get(componentProductId) || 0) + perCombo * quantity,
        );
      }
      continue;
    }

    const productId = Number(item?.productId || 0);
    if (!Number.isInteger(productId) || productId <= 0) continue;
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
      },
    });
  }
}
