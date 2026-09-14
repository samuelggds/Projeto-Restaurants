import { useEffect, useMemo, useRef, useState } from 'react';
import type { HomeProduct } from '../types';
import { readJsonStorage } from '../../../shared/storage/jsonStorage';
import { readStorage, writeStorage } from '../../../shared/storage/safeStorage';
import {
  normalizeProductOptionGroups,
  productConfigurationSignature,
  productConfigurationTotal,
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
  optionQuantities?: Array<{ optionId: string; quantity: number }>;
  options?: Array<{
    id: string;
    groupId: string;
    groupName: string;
    name: string;
    price: number;
    quantity?: number;
  }>;
  removedCompositionItemIds?: string[];
  removedCompositionItems?: Array<{ id: string; name: string }>;
  portions?: Array<{ optionId: string; name?: string; observation?: string }>;
  configurationVersion?: number;
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
  action?: 'open-cart',
) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isMoney(value: unknown) {
  return (
    (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) &&
    Number(value) >= 0 &&
    Number.isSafeInteger(Math.round(Number(value) * 100))
  );
}

function optionalArray(value: unknown, validEntry: (entry: unknown) => boolean) {
  return value == null || (Array.isArray(value) && value.every(validEntry));
}

function isStoredCartItem(value: unknown): value is CartItem {
  if (!isRecord(value)) return false;
  if (
    value.quantity !== undefined &&
    typeof value.quantity !== 'number' &&
    typeof value.quantity !== 'string'
  )
    return false;
  const validProductId =
    isId(value.productId) || (Number.isSafeInteger(value.productId) && Number(value.productId) > 0);
  const quantity = value.quantity === undefined ? 1 : Number(value.quantity);
  const namedEntry = (entry: unknown) =>
    isRecord(entry) && isId(entry.id) && typeof entry.name === 'string';
  const optionalText = (entry: unknown) => entry == null || typeof entry === 'string';
  return Boolean(
    validProductId &&
    typeof value.name === 'string' &&
    isMoney(value.price) &&
    Number.isSafeInteger(quantity) &&
    quantity > 0 &&
    (value.configurationVersion == null ||
      (Number.isSafeInteger(value.configurationVersion) &&
        Number(value.configurationVersion) >= 0)) &&
    optionalText(value.image) &&
    optionalText(value.observation) &&
    optionalArray(value.selectedOptionIds, isId) &&
    optionalArray(value.ingredientIds, isId) &&
    optionalArray(
      value.selectedOptions,
      (entry) =>
        isRecord(entry) &&
        isId(entry.groupId) &&
        Array.isArray(entry.optionIds) &&
        entry.optionIds.every(isId),
    ) &&
    optionalArray(
      value.optionQuantities,
      (entry) =>
        isRecord(entry) &&
        isId(entry.optionId) &&
        Number.isSafeInteger(entry.quantity) &&
        Number(entry.quantity) > 0,
    ) &&
    optionalArray(value.removedCompositionItemIds, isId) &&
    optionalArray(value.removedCompositionItems, namedEntry) &&
    optionalArray(
      value.portions,
      (entry) =>
        isRecord(entry) &&
        isId(entry.optionId) &&
        optionalText(entry.name) &&
        optionalText(entry.observation),
    ) &&
    optionalArray(
      value.options,
      (entry) =>
        namedEntry(entry) &&
        isRecord(entry) &&
        isId(entry.groupId) &&
        typeof entry.groupName === 'string' &&
        isMoney(entry.price) &&
        (entry.quantity == null ||
          (Number.isSafeInteger(entry.quantity) && Number(entry.quantity) > 0)),
    ) &&
    optionalArray(
      value.ingredients,
      (entry) => namedEntry(entry) && isRecord(entry) && isMoney(entry.price),
    ),
  );
}

export function normalizeStoredCart(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  // A damaged line must not crash the menu or silently lose its customization.
  // Preserve valid lines and discard malformed configurations as a whole.
  return items.filter(isStoredCartItem).map((item) => {
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
      optionQuantities: item.optionQuantities || [],
      removedCompositionItemIds: item.removedCompositionItemIds || [],
      portions: item.portions || [],
      configurationVersion: item.configurationVersion,
    };
    return {
      ...item,
      productId: String(item.productId),
      image: item.image || '',
      selectedOptions,
      selectedOptionIds: legacyOptionIds,
      cartId: isId(item.cartId)
        ? item.cartId
        : `${item.productId}::${productConfigurationSignature(configuration)}`,
      price: Number(item.price),
      quantity: item.quantity === undefined ? 1 : Number(item.quantity),
      stock:
        (typeof item.stock !== 'number' && typeof item.stock !== 'string') ||
        !Number.isSafeInteger(Number(item.stock)) ||
        Number(item.stock) < 0
          ? null
          : Number(item.stock),
      basePrice: isMoney(item.basePrice) ? Number(item.basePrice) : undefined,
      configurationVersion:
        Number.isSafeInteger(item.configurationVersion) && Number(item.configurationVersion) >= 0
          ? item.configurationVersion
          : undefined,
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
      const namespaced = normalizeStoredCart(readJsonStorage<unknown>(key, []));
      const legacyRestaurantId = Number(
        readStorage('cartRestaurantId') || readStorage('menuRestaurantId') || 0,
      );
      const legacy =
        namespaced.length === 0 && legacyRestaurantId === restaurantId
          ? normalizeStoredCart(readJsonStorage<unknown>('cartItems', []))
          : [];
      setCart(namespaced.length ? namespaced : legacy);
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
    writeStorage(`cartItems:${storageRestaurantId}`, serialized);
    // Espelho temporário para os atalhos de favoritos que ainda usam a chave legada.
    writeStorage('cartItems', serialized);
    writeStorage('cartRestaurantId', String(storageRestaurantId));
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
          const optionQuantities = new Map(
            (item.optionQuantities || []).map((entry) => [entry.optionId, entry.quantity]),
          );
          const currentOptions = normalizeProductOptionGroups(product).flatMap((group) =>
            group.options
              .filter((option) => optionIds.has(option.id))
              .map((option) => ({
                id: option.id,
                groupId: group.id,
                groupName: group.name,
                name: option.name,
                price: Number(option.absolutePrice ?? option.price ?? 0),
                quantity: optionQuantities.get(option.id) ?? option.defaultQuantity ?? 1,
              })),
          );
          const selections = Object.fromEntries(
            (item.selectedOptions || []).map((selection) => [
              selection.groupId,
              selection.optionIds,
            ]),
          );
          const nextPrice = productConfigurationTotal(
            product.price,
            normalizeProductOptionGroups(product),
            selections,
            {
              optionQuantities: Object.fromEntries(optionQuantities),
              portionConfiguration: product.portionConfiguration,
              portions: item.portions,
            },
          );
          const currentPortions = (item.portions || []).map((portion) => ({
            ...portion,
            name: normalizeProductOptionGroups(product)
              .flatMap((group) => group.options)
              .find((option) => option.id === portion.optionId)?.name,
          }));
          const removedCompositionItems = (product.compositionItems || [])
            .filter((compositionItem) =>
              (item.removedCompositionItemIds || []).includes(compositionItem.id),
            )
            .map((compositionItem) => ({ id: compositionItem.id, name: compositionItem.name }));
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
                  portions: currentPortions,
                  removedCompositionItems,
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
      const quantityByOption = new Map(
        (configuration.optionQuantities || []).map((entry) => [entry.optionId, entry.quantity]),
      );
      const options = groups.flatMap((group) =>
        group.options
          .filter((option) => selectedIds.has(option.id))
          .map((option) => ({
            id: option.id,
            groupId: group.id,
            groupName: group.name,
            name: option.name,
            price: Number(option.absolutePrice ?? option.price ?? 0),
            quantity: quantityByOption.get(option.id) ?? option.defaultQuantity ?? 1,
          })),
      );
      const selections = Object.fromEntries(
        configuration.selectedOptions.map((selection) => [selection.groupId, selection.optionIds]),
      );
      const unitPrice = productConfigurationTotal(product.price, groups, selections, {
        optionQuantities: Object.fromEntries(quantityByOption),
        portionConfiguration: product.portionConfiguration,
        portions: configuration.portions,
      });
      const portions = (configuration.portions || []).map((portion) => ({
        ...portion,
        name: groups
          .flatMap((group) => group.options)
          .find((option) => option.id === portion.optionId)?.name,
      }));
      const removedCompositionItems = (product.compositionItems || [])
        .filter((item) => (configuration.removedCompositionItemIds || []).includes(item.id))
        .map((item) => ({ id: item.id, name: item.name }));
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
          optionQuantities: configuration.optionQuantities,
          options,
          removedCompositionItemIds: configuration.removedCompositionItemIds,
          removedCompositionItems,
          portions,
          configurationVersion: configuration.configurationVersion,
          observation: configuration.observation,
        },
      ];
    });
    notify(
      'success',
      'Item adicionado',
      `${product.name} já está na sacola. Continue escolhendo ou abra a sacola quando quiser.`,
      3200,
      'open-cart',
    );
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
