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

export const CHECKOUT_RECOMMENDATION_GROUPS = [
  { id: 'sides', label: 'Acompanhamentos' },
  { id: 'drinks', label: 'Bebidas' },
  { id: 'desserts', label: 'Sobremesas' },
  { id: 'extras', label: 'Adicionais' },
  { id: 'other', label: 'Mais opções' },
] as const;

export type CheckoutRecommendationGroupId = (typeof CHECKOUT_RECOMMENDATION_GROUPS)[number]['id'];

export function getCheckoutRecommendationGroup(product: Pick<HomeProduct, 'categoryId'>): CheckoutRecommendationGroupId {
  const category = String(product.categoryId || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

  if (/(acompanh|porcao|porcoes|guarnic|entrada|petisco|aperitivo|fritas|batata|salada|side)/.test(category)) return 'sides';
  if (/(bebida|refrigerante|suco|agua|cafe|cha|cerveja|chopp|drink|coquetel|milk.?shake|vinho|energetico)/.test(category)) return 'drinks';
  if (/(sobremesa|doce|acai|sorvete|gelad|pudim|bolo|torta|brigadeiro|mousse|churros)/.test(category)) return 'desserts';
  if (/(adicion|extra|molho|cobertura|complemento)/.test(category)) return 'extras';
  return 'other';
}

/** Recomendações derivadas exclusivamente do cardápio público do restaurante atual. */
export function checkoutRecommendations(products: HomeProduct[], cart: CartItem[]) {
  const cartProductIds = new Set(cart.map((item) => String(item.productId)));
  const seen = new Set<string>();
  const groups = new Map<CheckoutRecommendationGroupId, HomeProduct[]>(
    CHECKOUT_RECOMMENDATION_GROUPS.map(({ id }) => [id, []]),
  );

  for (const product of products) {
    const id = String(product.id).trim();
    if (
      !id ||
      seen.has(id) ||
      cartProductIds.has(id) ||
      !product.available ||
      !product.name.trim() ||
      !Number.isFinite(product.price) ||
      product.price <= 0 ||
      (product.stock != null && (!Number.isFinite(product.stock) || product.stock <= 0))
    ) {
      continue;
    }

    seen.add(id);
    const group = groups.get(getCheckoutRecommendationGroup(product));
    if (group && group.length < 12) group.push(product);
  }

  return CHECKOUT_RECOMMENDATION_GROUPS.flatMap(({ id }) => groups.get(id) || []);
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


export function applyPurchasedStock<T extends { id: unknown; stock?: number | null; active?: boolean }>(
  products: T[],
  purchased: Map<string, number>,
) {
  return products.map((product) => {
    const quantity = purchased.get(String(product.id));
    if (!quantity || product.stock === null || product.stock === undefined) return product;
    const nextStock = Math.max(Number(product.stock) - quantity, 0);
    return {
      ...product,
      stock: nextStock,
      active: nextStock > 0 ? product.active : false,
    };
  });
}
