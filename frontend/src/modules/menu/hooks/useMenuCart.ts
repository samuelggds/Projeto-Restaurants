import { useMemo, useState } from "react";
import type {
  MenuCartItem,
  MenuProduct,
  ProductOption,
} from "../types/menu.types";

export function useMenuCart() {
  const [items, setItems] = useState<MenuCartItem[]>([]);

  function addItem(
    product: MenuProduct,
    quantity: number,
    selectedOptions: ProductOption[],
    notes: string,
  ) {
    const optionsPrice = selectedOptions.reduce(
      (total, opt) => total + opt.price,
      0,
    );
    setItems((current) => [
      ...current,
      {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity,
        selectedOptions,
        notes,
        unitPrice: product.price + optionsPrice,
      },
    ]);
  }

  function updateQuantity(id: string, quantity: number) {
    setItems((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  const count = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.unitPrice * item.quantity, 0),
    [items],
  );

  return { items, count, subtotal, addItem, updateQuantity };
}
