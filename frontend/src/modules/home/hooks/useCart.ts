import { useMemo, useState } from "react";
import type { CartItem, Product } from "../types/home.types";

const CART_KEY = "cartItems";

function readStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    // accept both old {productId} and new {id} shapes
    return parsed
      .filter((i) => i.id || (i as unknown as { productId?: number }).productId)
      .map((i) => ({
        ...i,
        id: i.id ?? (i as unknown as { productId?: number }).productId ?? 0,
        price: Number(i.price || 0),
        quantity: Number(i.quantity || 1),
      }));
  } catch {
    return [];
  }
}

export function isProductUnavailable(
  product: Product | null | undefined,
): boolean {
  if (!product) return true;
  if (product.active === false) return true;
  const rawStock = product.stock;
  if (rawStock === null || rawStock === undefined || rawStock === "")
    return false;
  const stockValue =
    typeof rawStock === "string"
      ? Number(rawStock.replace(",", "."))
      : Number(rawStock);
  return Number.isFinite(stockValue) && stockValue <= 0;
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart());

  function add(product: Product) {
    if (isProductUnavailable(product)) return;
    setItems((current) => {
      const found = current.find((item) => item.id === product.id);
      const next = found
        ? current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...current, { ...product, quantity: 1 }];
      localStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }

  function decrease(id: number) {
    setItems((current) => {
      const next = current
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0);
      localStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  }

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );

  return { items, count, total, add, decrease };
}
