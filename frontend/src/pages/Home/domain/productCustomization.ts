export type ProductSelectionType = 'SINGLE' | 'MULTIPLE';

export type ProductOption = {
  id: string;
  ingredientId?: string;
  name: string;
  price: number;
  pricingMode?: 'ADDITIVE' | 'ABSOLUTE';
  absolutePrice?: number | null;
  allowQuantity?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  defaultQuantity?: number;
  active: boolean;
  locked?: boolean;
  defaultSelected?: boolean;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  description?: string;
  required: boolean;
  selectionType: ProductSelectionType;
  minSelections: number;
  maxSelections: number | null;
  options: ProductOption[];
};

export type ProductGroupSelection = {
  groupId: string;
  optionIds: string[];
};

export type ProductConfiguration = {
  selectedOptions: ProductGroupSelection[];
  selectedOptionIds: string[];
  observation: string;
  optionQuantities?: Array<{ optionId: string; quantity: number }>;
  removedCompositionItemIds?: string[];
  portions?: Array<{ optionId: string; observation?: string }>;
  configurationVersion?: number;
};

export type ConfigurableProduct = {
  optionGroups?: ProductOptionGroup[];
  ingredients?: Array<{
    id: string;
    name: string;
    price: number;
    required?: boolean;
    active?: boolean;
  }>;
  configurationVersion?: number;
  compositionItems?: Array<{
    id: string;
    ingredientId: string;
    name: string;
    removable: boolean;
    active: boolean;
  }>;
  portionConfiguration?: {
    enabled: boolean;
    optionGroupId: string;
    minPortions: number;
    maxPortions: number;
    pricingStrategy: 'ADD' | 'HIGHEST' | 'AVERAGE' | 'PROPORTIONAL' | 'FIXED';
    allowPortionObservations: boolean;
  } | null;
};

export type SelectionState = Record<string, string[]>;
export type SelectionErrors = Record<string, string>;
export type OptionQuantityState = Record<string, number>;
export type PortionSelection = { optionId: string; observation?: string };

type ConfigurationPriceDetails = {
  optionQuantities?: OptionQuantityState;
  portionConfiguration?: ConfigurableProduct['portionConfiguration'];
  portions?: PortionSelection[];
};

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function normalizeProductOptionGroups(product: ConfigurableProduct): ProductOptionGroup[] {
  if (Array.isArray(product.optionGroups) && product.optionGroups.length) {
    return product.optionGroups
      .map((group) => {
        const activeOptions = (group.options || []).filter((option) => option.active !== false);
        const selectionType: ProductSelectionType =
          group.selectionType === 'SINGLE' ? 'SINGLE' : 'MULTIPLE';
        const required = Boolean(group.required);
        const minSelections = Math.min(
          activeOptions.length,
          Math.max(required ? 1 : 0, positiveInteger(group.minSelections, required ? 1 : 0)),
        );
        const configuredMax =
          group.maxSelections === null || group.maxSelections === undefined
            ? selectionType === 'SINGLE'
              ? 1
              : activeOptions.length
            : positiveInteger(
                group.maxSelections,
                selectionType === 'SINGLE' ? 1 : activeOptions.length,
              );
        const maxSelections = Math.max(
          minSelections,
          Math.min(activeOptions.length, selectionType === 'SINGLE' ? 1 : configuredMax),
        );

        return {
          ...group,
          id: String(group.id),
          selectionType,
          required,
          minSelections,
          maxSelections,
          options: activeOptions.map((option) => ({
            ...option,
            id: String(option.id),
            ingredientId: option.ingredientId ? String(option.ingredientId) : undefined,
            price: Number(option.price || 0),
            absolutePrice:
              option.absolutePrice === null || option.absolutePrice === undefined
                ? null
                : Number(option.absolutePrice),
            minQuantity: Math.max(1, positiveInteger(option.minQuantity, 1)),
            maxQuantity: Math.max(1, positiveInteger(option.maxQuantity, 1)),
            defaultQuantity: Math.max(1, positiveInteger(option.defaultQuantity, 1)),
            active: option.active !== false,
          })),
        };
      })
      .filter((group) => group.options.length > 0);
  }

  const ingredients = (product.ingredients || []).filter(
    (ingredient) => ingredient.active !== false,
  );
  if (!ingredients.length) return [];

  return [
    {
      id: 'legacy-ingredients',
      name: 'Ingredientes',
      description: 'Confira o que já acompanha o produto e escolha seus adicionais.',
      required: ingredients.some((ingredient) => ingredient.required),
      selectionType: 'MULTIPLE',
      minSelections: ingredients.filter((ingredient) => ingredient.required).length,
      maxSelections: ingredients.length,
      options: ingredients.map((ingredient) => ({
        id: String(ingredient.id),
        ingredientId: String(ingredient.id),
        name: ingredient.name,
        price: Number(ingredient.price || 0),
        active: true,
        locked: Boolean(ingredient.required),
        defaultSelected: Boolean(ingredient.required),
      })),
    },
  ];
}

export function createInitialSelections(groups: ProductOptionGroup[]): SelectionState {
  return Object.fromEntries(
    groups.map((group) => {
      const defaults = group.options
        .filter((option) => option.defaultSelected || option.locked)
        .map((option) => option.id)
        .slice(0, group.maxSelections ?? undefined);
      return [group.id, defaults];
    }),
  );
}

export function toggleProductOption(
  groups: ProductOptionGroup[],
  selections: SelectionState,
  groupId: string,
  optionId: string,
): SelectionState {
  const group = groups.find((candidate) => candidate.id === groupId);
  const option = group?.options.find((candidate) => candidate.id === optionId);
  if (!group || !option || option.active === false) return selections;

  const current = selections[groupId] || [];
  if (option.locked && current.includes(optionId)) return selections;

  if (group.selectionType === 'SINGLE') {
    return { ...selections, [groupId]: current.includes(optionId) ? [] : [optionId] };
  }

  if (current.includes(optionId)) {
    return { ...selections, [groupId]: current.filter((id) => id !== optionId) };
  }
  if (group.maxSelections != null && current.length >= group.maxSelections) return selections;
  return { ...selections, [groupId]: [...current, optionId] };
}

export function validateProductSelections(
  groups: ProductOptionGroup[],
  selections: SelectionState,
): SelectionErrors {
  return groups.reduce<SelectionErrors>((errors, group) => {
    const count = (selections[group.id] || []).length;
    if (count < group.minSelections) {
      errors[group.id] =
        group.minSelections === 1
          ? `Escolha 1 opção em ${group.name}.`
          : `Escolha pelo menos ${group.minSelections} opções em ${group.name}.`;
      return errors;
    }
    if (group.maxSelections != null && count > group.maxSelections) {
      errors[group.id] = `Escolha no máximo ${group.maxSelections} opções em ${group.name}.`;
    }
    return errors;
  }, {});
}

export function selectedProductOptions(
  groups: ProductOptionGroup[],
  selections: SelectionState,
): ProductOption[] {
  const selectedIds = new Set(Object.values(selections).flat());
  return groups.flatMap((group) => group.options).filter((option) => selectedIds.has(option.id));
}

export function productConfigurationTotal(
  basePrice: number,
  groups: ProductOptionGroup[],
  selections: SelectionState,
  details: ConfigurationPriceDetails = {},
) {
  const portionGroupId = details.portionConfiguration?.enabled
    ? details.portionConfiguration.optionGroupId
    : null;
  const regularGroups = groups.filter((group) => group.id !== portionGroupId);
  const regularOptions = selectedProductOptions(regularGroups, selections);
  const absolute = regularOptions.find((option) => option.pricingMode === 'ABSOLUTE');
  const additiveCents = regularOptions
    .filter((option) => option.pricingMode !== 'ABSOLUTE')
    .reduce(
      (total, option) =>
        total +
        Math.round(Number(option.price || 0) * 100) *
          Math.max(1, details.optionQuantities?.[option.id] ?? option.defaultQuantity ?? 1),
      0,
    );

  let resolvedBaseCents = Math.round(
    Number(absolute?.absolutePrice ?? absolute?.price ?? basePrice ?? 0) * 100,
  );
  let portionCents = 0;
  const portionConfiguration = details.portionConfiguration;
  if (portionConfiguration?.enabled && details.portions?.length) {
    const portionGroup = groups.find((group) => group.id === portionConfiguration.optionGroupId);
    const prices = details.portions.map((portion) => {
      const option = portionGroup?.options.find((candidate) => candidate.id === portion.optionId);
      return {
        cents: Math.round(Number(option?.absolutePrice ?? option?.price ?? 0) * 100),
        absolute: option?.pricingMode === 'ABSOLUTE',
      };
    });
    const values = prices.map((entry) => entry.cents);
    let calculated = 0;
    if (portionConfiguration.pricingStrategy === 'ADD') {
      calculated = values.reduce((sum, value) => sum + value, 0);
    } else if (portionConfiguration.pricingStrategy === 'HIGHEST') {
      calculated = Math.max(0, ...values);
    } else if (
      portionConfiguration.pricingStrategy === 'AVERAGE' ||
      portionConfiguration.pricingStrategy === 'PROPORTIONAL'
    ) {
      calculated = values.length
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;
    }
    if (prices[0]?.absolute && portionConfiguration.pricingStrategy !== 'FIXED') {
      resolvedBaseCents = calculated;
    } else {
      portionCents = calculated;
    }
  }

  return (resolvedBaseCents + additiveCents + portionCents) / 100;
}

export function buildProductConfiguration(
  groups: ProductOptionGroup[],
  selections: SelectionState,
  observation: string,
  details: {
    optionQuantities?: OptionQuantityState;
    removedCompositionItemIds?: string[];
    portions?: PortionSelection[];
    configurationVersion?: number;
  } = {},
): ProductConfiguration {
  const selectedOptions = groups
    .map((group) => ({
      groupId: group.id,
      optionIds: (selections[group.id] || []).slice(),
    }))
    .filter((selection) => selection.optionIds.length > 0);

  return {
    selectedOptions,
    selectedOptionIds: selectedOptions.flatMap((selection) => selection.optionIds),
    observation: observation.trim(),
    optionQuantities: Object.entries(details.optionQuantities || {})
      .filter(
        ([optionId, quantity]) =>
          selectedOptions.some((selection) => selection.optionIds.includes(optionId)) &&
          quantity > 0,
      )
      .map(([optionId, quantity]) => ({ optionId, quantity })),
    removedCompositionItemIds: [...(details.removedCompositionItemIds || [])],
    portions: (details.portions || []).map((portion) => ({
      optionId: portion.optionId,
      ...(portion.observation?.trim() ? { observation: portion.observation.trim() } : {}),
    })),
    configurationVersion: details.configurationVersion,
  };
}

export function productConfigurationSignature(configuration: ProductConfiguration) {
  const groups = configuration.selectedOptions
    .map((selection) => `${selection.groupId}:${selection.optionIds.slice().sort().join(',')}`)
    .sort()
    .join('|');
  const quantities = (configuration.optionQuantities || [])
    .map((entry) => `${entry.optionId}:${entry.quantity}`)
    .sort()
    .join('|');
  const removals = [...(configuration.removedCompositionItemIds || [])].sort().join(',');
  const portions = (configuration.portions || [])
    .map(
      (portion, index) =>
        `${index}:${portion.optionId}:${String(portion.observation || '')
          .trim()
          .toLocaleLowerCase('pt-BR')}`,
    )
    .join('|');
  return [
    groups,
    quantities,
    removals,
    portions,
    configuration.observation.trim().toLocaleLowerCase('pt-BR'),
    configuration.configurationVersion ?? '',
  ].join('::');
}
