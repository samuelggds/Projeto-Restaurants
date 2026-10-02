import type { CartItem } from '../hooks/useCart';
import type { HomeProduct } from '../types';

export function resolveHomeRestaurantId(input: {
  mesaMode: boolean;
  normalizedSlug: string;
  routeRestaurantId: number | null;
  storedSessionRestaurantId: number | null;
  resolvedRestaurantId: number | null;
  authenticatedRestaurantId: number | null;
  rememberedRestaurantId: number | null;
  defaultRestaurantId: number | null;
}) {
  if (input.mesaMode) {
    return (
      input.routeRestaurantId ||
      input.storedSessionRestaurantId ||
      input.resolvedRestaurantId ||
      null
    );
  }

  if (input.normalizedSlug) return input.resolvedRestaurantId;
  return (
    input.authenticatedRestaurantId ||
    input.rememberedRestaurantId ||
    input.storedSessionRestaurantId ||
    input.defaultRestaurantId ||
    null
  );
}

export function checkoutRecommendations(products: HomeProduct[], cart: CartItem[]) {
  const cartProductIds = new Set(cart.map((item) => String(item.productId)));
  return products
    .filter((product) => product.available && !cartProductIds.has(String(product.id)))
    .slice(0, 3);
}

export function collectPurchasedProductQuantities(cart: CartItem[], products: HomeProduct[]) {
  const purchased = new Map<string, number>();

  cart.forEach((item) => {
    const homeProduct = products.find(
      (product) => String(product.id) === String(item.productId),
    );
    if (homeProduct?.kind === 'COMBO') {
      (item.comboSelections || []).forEach((selection) => {
        const group = (homeProduct.comboGroups || []).find(
          (candidate) => candidate.id === selection.groupId,
        );
        selection.items.forEach((selectedItem) => {
          const option = group?.options.find(
            (candidate) => candidate.id === selectedItem.optionId,
          );
          if (!option) return;
          const quantity = Number(selectedItem.quantity) * Number(item.quantity);
          const key = String(option.productId);
          purchased.set(key, (purchased.get(key) || 0) + quantity);
        });
      });
      return;
    }

    const key = String(item.productId);
    purchased.set(key, (purchased.get(key) || 0) + Number(item.quantity));
  });

  return purchased;
}
