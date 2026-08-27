import type { CartItem } from '../../Home/hooks/useCart';

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : null;
}

function getOrderItems(order: RecordValue): RecordValue[] {
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.orderItems)
      ? order.orderItems
      : [];

  return items.map(asRecord).filter((item): item is RecordValue => Boolean(item));
}

/** Converts the persisted order items into the cart format used by the storefront. */
export function buildReorderCart(order: RecordValue): CartItem[] {
  return getOrderItems(order).flatMap((item) => {
    const product = asRecord(item.product) ?? {};
    const productId = product.id ?? item.productId;
    const name = String(product.name ?? item.productName ?? item.name ?? '').trim();
    const price = Number(item.price ?? product.price ?? 0);
    const quantity = Math.max(1, Math.trunc(Number(item.quantity) || 1));

    if (!productId || !name || !Number.isFinite(price) || price < 0) {
      return [];
    }

    return [
      {
        productId: String(productId),
        name,
        price,
        quantity,
        image: String(product.image ?? item.image ?? ''),
        stock: typeof product.stock === 'number' ? product.stock : null,
      },
    ];
  });
}

export function findOrderByDisplayId(
  orders: RecordValue[],
  displayId: string,
): RecordValue | undefined {
  const normalizedId = Number(String(displayId).replace(/\D/g, ''));
  return orders.find((order) => Number(order.id) === normalizedId);
}
