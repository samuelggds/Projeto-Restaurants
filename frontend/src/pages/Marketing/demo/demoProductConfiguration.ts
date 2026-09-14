import type { AdminIngredient, AdminProduct } from '../../admin/types';
import type { HomeProduct } from '../../Home/types';
import {
  normalizeProductOptionGroups,
  productConfigurationSignature,
  productConfigurationTotal,
  validateProductSelections,
  type ProductConfiguration,
} from '../../Home/domain/productCustomization';

export function isDemoConfiguration(value: unknown): value is ProductConfiguration {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  const ids = (items: unknown) =>
    Array.isArray(items) && items.every((id) => typeof id === 'string');
  return (
    typeof c.observation === 'string' &&
    ids(c.selectedOptionIds) &&
    Array.isArray(c.selectedOptions) &&
    c.selectedOptions.every(
      (entry) => entry && typeof entry.groupId === 'string' && ids(entry.optionIds),
    ) &&
    (c.removedCompositionItemIds === undefined || ids(c.removedCompositionItemIds)) &&
    (c.configurationVersion === undefined || Number.isSafeInteger(c.configurationVersion)) &&
    (c.optionQuantities === undefined ||
      (Array.isArray(c.optionQuantities) &&
        c.optionQuantities.every(
          (entry) =>
            entry &&
            typeof entry.optionId === 'string' &&
            Number.isSafeInteger(entry.quantity) &&
            entry.quantity > 0,
        ))) &&
    (c.portions === undefined ||
      (Array.isArray(c.portions) &&
        c.portions.every(
          (entry) =>
            entry &&
            typeof entry.optionId === 'string' &&
            (entry.observation === undefined || typeof entry.observation === 'string'),
        )))
  );
}

export function demoConfigurationIsCurrent(
  product: HomeProduct,
  configuration?: ProductConfiguration,
) {
  const groups = normalizeProductOptionGroups(product);
  if (!configuration) return !groups.length && !product.compositionItems?.length;
  if (!isDemoConfiguration(configuration)) return false;
  if ((product.configurationVersion ?? 0) !== (configuration.configurationVersion ?? 0))
    return false;
  const selections = Object.fromEntries(
    configuration.selectedOptions.map((entry) => [entry.groupId, entry.optionIds]),
  );
  if (Object.keys(selections).length !== configuration.selectedOptions.length) return false;
  if (Object.keys(validateProductSelections(groups, selections)).length) return false;
  for (const entry of configuration.selectedOptions) {
    const group = groups.find((item) => item.id === entry.groupId);
    if (
      !group ||
      new Set(entry.optionIds).size !== entry.optionIds.length ||
      entry.optionIds.some((id) => !group.options.some((option) => option.id === id))
    )
      return false;
  }
  const ids = configuration.selectedOptions.flatMap((entry) => entry.optionIds).sort();
  if (JSON.stringify(ids) !== JSON.stringify([...configuration.selectedOptionIds].sort()))
    return false;
  for (const entry of configuration.optionQuantities ?? []) {
    const option = groups
      .flatMap((group) => group.options)
      .find((item) => item.id === entry.optionId);
    if (
      !option ||
      !ids.includes(entry.optionId) ||
      (!option.allowQuantity && entry.quantity !== 1) ||
      entry.quantity < (option.minQuantity ?? 1) ||
      entry.quantity > (option.maxQuantity ?? 99)
    )
      return false;
  }
  if (
    (configuration.removedCompositionItemIds ?? []).some(
      (id) =>
        !product.compositionItems?.some((item) => item.id === id && item.removable && item.active),
    )
  )
    return false;
  const portion = product.portionConfiguration;
  if (portion?.enabled) {
    const selected = configuration.portions ?? [];
    const group = groups.find((item) => item.id === portion.optionGroupId);
    if (
      selected.length < portion.minPortions ||
      selected.length > portion.maxPortions ||
      selected.some((entry) => !group?.options.some((item) => item.id === entry.optionId))
    )
      return false;
  }
  return true;
}

export function demoProductConfiguration(
  product: AdminProduct,
  ingredients: AdminIngredient[],
): Pick<
  HomeProduct,
  'saleMode' | 'optionGroups' | 'compositionItems' | 'portionConfiguration' | 'configurationVersion'
> {
  const optionGroups = (product.optionGroups ?? []).map((group, index) => ({
    ...group,
    id: String(group.id ?? `${product.id}-group-${index}`),
    options: group.options.map((option, optionIndex) => {
      const ingredient = ingredients.find((item) => item.id === option.ingredientId);
      return {
        ...option,
        id: String(option.id ?? `${product.id}-option-${index}-${optionIndex}`),
        ingredientId: String(option.ingredientId),
        name: ingredient?.name ?? 'Ingrediente indisponível',
        image: ingredient?.image,
        price: option.additionalPrice ?? ingredient?.price ?? 0,
        active: Boolean(ingredient && ingredient.active !== false && option.active !== false),
      };
    }),
  }));
  const portion = product.portionConfiguration;
  return {
    saleMode: product.saleMode ?? 'COMPLETE',
    configurationVersion: product.configurationVersion,
    optionGroups,
    compositionItems: (product.compositionItems ?? []).flatMap((item, index) => {
      const ingredient = ingredients.find((entry) => entry.id === item.ingredientId);
      return ingredient
        ? [
            {
              ...item,
              id: String(item.id ?? `${product.id}-composition-${index}`),
              ingredientId: String(item.ingredientId),
              name: ingredient.name,
              active: item.active !== false && ingredient.active !== false,
            },
          ]
        : [];
    }),
    portionConfiguration: portion
      ? {
          ...portion,
          optionGroupId:
            optionGroups.find((group) => group.name === portion.optionGroupName)?.id ?? '',
        }
      : null,
  };
}

export function demoConfiguredLine(
  product: Pick<HomeProduct, 'id' | 'name' | 'price'> & Partial<HomeProduct>,
  configuration?: ProductConfiguration,
) {
  if (!configuration)
    return { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1 };
  const groups = normalizeProductOptionGroups(product);
  const selections = Object.fromEntries(
    configuration.selectedOptions.map((item) => [item.groupId, item.optionIds]),
  );
  const quantities = Object.fromEntries(
    (configuration.optionQuantities ?? []).map((item) => [item.optionId, item.quantity]),
  );
  const selected = new Set(configuration.selectedOptionIds);
  const customizations = groups.flatMap((group) =>
    group.options
      .filter((option) => selected.has(option.id))
      .map((option) => `${quantities[option.id] ?? option.defaultQuantity ?? 1}x ${option.name}`),
  );
  customizations.push(
    ...(product.compositionItems ?? [])
      .filter((item) => configuration.removedCompositionItemIds?.includes(item.id))
      .map((item) => `Sem ${item.name}`),
  );
  for (const portion of configuration.portions ?? []) {
    const option = groups
      .flatMap((group) => group.options)
      .find((item) => item.id === portion.optionId);
    if (option)
      customizations.push(`${option.name}${portion.observation ? `: ${portion.observation}` : ''}`);
  }
  if (configuration.observation.trim())
    customizations.push(`Observação: ${configuration.observation.trim()}`);
  return {
    productId: product.id,
    name: product.name,
    quantity: 1,
    configuration,
    customizations,
    cartId: `${product.id}::${productConfigurationSignature(configuration)}`,
    unitPrice: productConfigurationTotal(product.price, groups, selections, {
      optionQuantities: quantities,
      portionConfiguration: product.portionConfiguration,
      portions: configuration.portions,
    }),
  };
}
