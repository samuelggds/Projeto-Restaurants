import { useEffect, useMemo, useState } from "react";
import type { HomeProduct } from "../types";
import { readJsonStorage } from "../../../shared/storage/jsonStorage";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock?: number | null;
};

type Notify = (type: "success" | "warning", title: string, message: string, duration?: number) => void;

export function useCart(products: HomeProduct[], notify: Notify) {
  const [cart, setCart] = useState<CartItem[]>(() => readJsonStorage<CartItem[]>("cartItems", []).map((item) => ({
    ...item,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 1),
  })));

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const currentQuantity = cart.find((item) => item.productId === productId)?.quantity || 0;
    if (product.stock != null && currentQuantity >= product.stock) {
      notify("warning", "Limite de estoque", `Disponível: ${product.stock} unidade${product.stock === 1 ? "" : "s"}.`);
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.productId === productId);
      if (existing) return current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { productId, name: product.name, price: product.price, quantity: 1, image: product.image, stock: product.stock }];
    });
    notify("success", product.name, "Adicionado à sacola!", 2000);
  };

  const decreaseCart = (productId: string) => {
    setCart((current) => current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item).filter((item) => item.quantity > 0));
  };

  const totals = useMemo(() => ({
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
    value: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }), [cart]);

  return { cart, setCart, addToCart, decreaseCart, cartCount: totals.count, cartTotal: totals.value };
}
