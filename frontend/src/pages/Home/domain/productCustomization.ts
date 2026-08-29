export type ProductSelectionType = 'SINGLE' | 'MULTIPLE';

export type ProductOption = {
  id: string;
  ingredientId?: string;
  name: string;
  price: number;
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
};

export type SelectionState = Record<string, string[]>;
export type SelectionErrors = Record<string, string>;

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
) {
  return selectedProductOptions(groups, selections).reduce(
    (total, option) => total + Number(option.price || 0),
    Number(basePrice || 0),
  );
}

export function buildProductConfiguration(
  groups: ProductOptionGroup[],
  selections: SelectionState,
  observation: string,
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
  };
}

export function productConfigurationSignature(configuration: ProductConfiguration) {
  const groups = configuration.selectedOptions
    .map((selection) => `${selection.groupId}:${selection.optionIds.slice().sort().join(',')}`)
    .sort()
    .join('|');
  return `${groups}::${configuration.observation.trim().toLocaleLowerCase('pt-BR')}`;
}
