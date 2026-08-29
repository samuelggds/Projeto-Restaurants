import { useEffect, useMemo, useRef, useState } from 'react';
import type { HomeProduct } from '../types';
import { readJsonStorage } from '../../../shared/storage/jsonStorage';
import {
  normalizeProductOptionGroups,
  productConfigurationSignature,
  type ProductConfiguration,
  type ProductGroupSelection,
} from '../domain/productCustomization';

export type CartItem = {
  cartId?: string;
  productId: string;
  name: string;
  price: number;
  basePrice?: number;
  quantity: number;
  image: string;
  stock?: number | null;
  selectedOptionIds?: string[];
  selectedOptions?: ProductGroupSelection[];
  options?: Array<{ id: string; groupId: string; groupName: string; name: string; price: number }>;
  observation?: string;
  /** Compatibilidade com sacolas criadas antes dos grupos de opções. */
  ingredientIds?: string[];
  ingredients?: Array<{ id: string; name: string; price: number }>;
};

type Notify = (
  type: 'success' | 'warning',
  title: string,
  message: string,
  duration?: number,
) => void;

function normalizeStoredCart(items: CartItem[]) {
  return items.map((item) => {
    const legacyOptionIds = item.selectedOptionIds || item.ingredientIds || [];
    const selectedOptions =
      item.selectedOptions ||
      (legacyOptionIds.length
        ? [{ groupId: 'legacy-ingredients', optionIds: legacyOptionIds }]
        : []);
    const configuration: ProductConfiguration = {
      selectedOptions,
      selectedOptionIds: legacyOptionIds,
      observation: item.observation || '',
    };
    return {
      ...item,
      selectedOptions,
      selectedOptionIds: legacyOptionIds,
      cartId: item.cartId || `${item.productId}::${productConfigurationSignature(configuration)}`,
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
    };
  });
}

export function useCart(products: HomeProduct[], notify: Notify, restaurantId?: number | null) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [storageRestaurantId, setStorageRestaurantId] = useState<number | null>(null);
  const reconciledSignatureRef = useRef('');

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (!restaurantId) {
        setCart([]);
        setStorageRestaurantId(null);
        return;
      }
      const key = `cartItems:${restaurantId}`;
      const namespaced = readJsonStorage<CartItem[]>(key, []);
      const legacyRestaurantId = Number(
        localStorage.getItem('cartRestaurantId') || localStorage.getItem('menuRestaurantId') || 0,
      );
      const legacy =
        namespaced.length === 0 && legacyRestaurantId === restaurantId
          ? readJsonStorage<CartItem[]>('cartItems', [])
          : [];
      setCart(normalizeStoredCart(namespaced.length ? namespaced : legacy));
      setStorageRestaurantId(restaurantId);
      reconciledSignatureRef.current = '';
    });
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!storageRestaurantId || storageRestaurantId !== restaurantId) return;
    const serialized = JSON.stringify(cart);
    localStorage.setItem(`cartItems:${storageRestaurantId}`, serialized);
    // Espelho temporário para os atalhos de favoritos que ainda usam a chave legada.
    localStorage.setItem('cartItems', serialized);
    localStorage.setItem('cartRestaurantId', String(storageRestaurantId));
  }, [cart, restaurantId, storageRestaurantId]);

  const catalogSignature = useMemo(
    () =>
      products
        .map((product) =>
          [
            product.id,
            product.price,
            product.stock ?? '∞',
            ...(product.optionGroups || []).flatMap((group) =>
              group.options.map((option) => `${option.id}:${option.price}:${option.active}`),
            ),
          ].join(':'),
        )
        .join('|'),
    [products],
  );

  useEffect(() => {
    if (
      !restaurantId ||
      storageRestaurantId !== restaurantId ||
      !products.length ||
      reconciledSignatureRef.current === catalogSignature
    )
      return;
    reconciledSignatureRef.current = catalogSignature;
    const productsById = new Map(products.map((product) => [product.id, product]));
    queueMicrotask(() =>
      setCart((current) => {
        let changed = false;
        const reconciled = current.flatMap((item) => {
          const product = productsById.get(String(item.productId));
          if (!product || !product.available) {
            changed = true;
            return [];
          }
          const optionIds = new Set(item.selectedOptionIds || item.ingredientIds || []);
          const currentOptions = normalizeProductOptionGroups(product).flatMap((group) =>
            group.options
              .filter((option) => optionIds.has(option.id))
              .map((option) => ({
                id: option.id,
                groupId: group.id,
                groupName: group.name,
                name: option.name,
                price: Number(option.price || 0),
              })),
          );
          const nextPrice = currentOptions.reduce(
            (total, option) => total + option.price,
            product.price,
          );
          const nextQuantity =
            product.stock == null
              ? item.quantity
              : Math.min(item.quantity, Math.max(0, product.stock));
          if (
            nextPrice !== item.price ||
            nextQuantity !== item.quantity ||
            item.stock !== product.stock ||
            JSON.stringify(currentOptions) !== JSON.stringify(item.options || [])
          )
            changed = true;
          return nextQuantity > 0
            ? [
                {
                  ...item,
                  price: nextPrice,
                  basePrice: product.price,
                  stock: product.stock,
                  quantity: nextQuantity,
                  options: currentOptions,
                },
              ]
            : [];
        });
        return changed ? reconciled : current;
      }),
    );
  }, [catalogSignature, products, restaurantId, storageRestaurantId]);

  const addToCart = (productId: string, configuration: ProductConfiguration) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const signature = productConfigurationSignature(configuration);
    const cartId = `${productId}::${signature}`;
    const currentQuantity = cart
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
    if (product.stock != null && currentQuantity >= product.stock) {
      notify(
        'warning',
        'Limite de estoque',
        `Disponível: ${product.stock} unidade${product.stock === 1 ? '' : 's'}.`,
      );
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.cartId === cartId);
      if (existing)
        return current.map((item) =>
          item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      const groups = normalizeProductOptionGroups(product);
      const selectedIds = new Set(configuration.selectedOptionIds);
      const options = groups.flatMap((group) =>
        group.options
          .filter((option) => selectedIds.has(option.id))
          .map((option) => ({
            id: option.id,
            groupId: group.id,
            groupName: group.name,
            name: option.name,
            price: Number(option.price || 0),
          })),
      );
      const unitPrice = options.reduce((total, option) => total + option.price, product.price);
      return [
        ...current,
        {
          productId,
          cartId,
          name: product.name,
          price: unitPrice,
          basePrice: product.price,
          quantity: 1,
          image: product.image,
          stock: product.stock,
          selectedOptionIds: configuration.selectedOptionIds,
          selectedOptions: configuration.selectedOptions,
          options,
          observation: configuration.observation,
        },
      ];
    });
    notify('success', product.name, 'Adicionado à sacola!', 2000);
  };

  const increaseCart = (cartId: string) => {
    setCart((current) => {
      const target = current.find((item) => item.cartId === cartId);
      if (!target) return current;
      const product = products.find((item) => item.id === target.productId);
      const totalProductQuantity = current
        .filter((item) => item.productId === target.productId)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (product?.stock != null && totalProductQuantity >= product.stock) {
        notify(
          'warning',
          'Limite de estoque',
          `Disponível: ${product.stock} unidade${product.stock === 1 ? '' : 's'}.`,
        );
        return current;
      }
      return current.map((item) =>
        item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  };

  const decreaseCart = (cartId: string) => {
    setCart((current) =>
      current
        .map((item) => (item.cartId === cartId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const totals = useMemo(
    () => ({
      count: cart.reduce((sum, item) => sum + item.quantity, 0),
      value: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    [cart],
  );

  return {
    cart,
    setCart,
    addToCart,
    increaseCart,
    decreaseCart,
    cartCount: totals.count,
    cartTotal: totals.value,
  };
}
