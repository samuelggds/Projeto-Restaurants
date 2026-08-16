import type { CartItem } from '../../home/hooks/useCart';
import type { ProfileFavorite } from '../types';

export type FavoriteCartResult =
  { cart: CartItem[]; error?: never } | { cart: CartItem[]; error: 'unavailable' | 'stockLimit' };

export function addFavoriteToCart(cart: CartItem[], favorite: ProfileFavorite): FavoriteCartResult {
  if (favorite.stock != null && favorite.stock <= 0) {
    return { cart, error: 'unavailable' };
  }

  const currentQuantity = cart.find((item) => item.productId === favorite.id)?.quantity ?? 0;

  if (favorite.stock != null && currentQuantity >= favorite.stock) {
    return { cart, error: 'stockLimit' };
  }

  const existing = cart.find((item) => item.productId === favorite.id);
  if (existing) {
    return {
      cart: cart.map((item) =>
        item.productId === favorite.id ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    };
  }

  return {
    cart: [
      ...cart,
      {
        productId: favorite.id,
        name: favorite.name,
        price: favorite.price,
        quantity: 1,
        image: favorite.image,
        stock: favorite.stock,
      },
    ],
  };
}
