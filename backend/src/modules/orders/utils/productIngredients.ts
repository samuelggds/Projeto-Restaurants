type LegacyIngredient = {
  id: number;
  name: string;
  price: unknown;
  required: boolean;
  active: boolean;
};

type CatalogIngredient = {
  id: number;
  restaurantId: number;
  name: string;
  price: unknown;
  active: boolean;
};

type ProductOption = {
  id: number;
  active: boolean;
  ingredientId: number;
  ingredient: CatalogIngredient;
};

type ProductOptionGroup = {
  id: number;
  restaurantId: number;
  name: string;
  description?: string | null;
  required: boolean;
  selectionType: 'SINGLE' | 'MULTIPLE';
  minSelections: number;
  maxSelections: number;
  active: boolean;
  options: ProductOption[];
};

type ProductWithOptions = {
  id?: number;
  restaurantId?: number;
  name: string;
  saleMode: 'COMPLETE' | 'BUILDABLE';
  price: unknown;
  ingredients: LegacyIngredient[];
  optionGroups?: ProductOptionGroup[];
};

export type OrderItemOptionSelection = {
  ingredientIds?: number[];
  optionIds?: number[];
  selectedOptions?: Array<{ groupId?: number; optionIds?: number[] }>;
};

function money(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error('O produto possui um valor de opção inválido.');
  }
  return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

function uniquePositiveIds(values: number[] | undefined, field: string) {
  const ids = (values || []).map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error(`${field} contém uma opção inválida.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${field} contém opções repetidas.`);
  }
  return ids;
}

function resolveExplicitOptionIds(
  product: ProductWithOptions,
  selection: OrderItemOptionSelection,
) {
  const flatIds = uniquePositiveIds(selection.optionIds, 'A montagem');
  const structured = selection.selectedOptions;

  if (!structured?.length) {
    return flatIds;
  }

  const seenGroups = new Set<number>();
  const structuredIds: number[] = [];
  structured.forEach((selectedGroup) => {
    const groupId = Number(selectedGroup.groupId);
    if (!Number.isInteger(groupId) || groupId <= 0) {
      throw new Error('A montagem contém um grupo inválido.');
    }
    if (seenGroups.has(groupId)) {
      throw new Error('A montagem contém o mesmo grupo mais de uma vez.');
    }
    seenGroups.add(groupId);

    const group = (product.optionGroups || []).find((candidate) => candidate.id === groupId);
    if (!group || !group.active || group.restaurantId !== product.restaurantId) {
      throw new Error(`Grupo de opções inválido para ${product.name}.`);
    }

    const ids = uniquePositiveIds(selectedGroup.optionIds, `O grupo ${group.name}`);
    if (ids.some((id) => !group.options.some((option) => option.id === id))) {
      throw new Error(`Uma opção não pertence ao grupo ${group.name}.`);
    }
    structuredIds.push(...ids);
  });

  if (flatIds.length) {
    const flatSignature = [...flatIds].sort((a, b) => a - b).join(',');
    const structuredSignature = [...structuredIds].sort((a, b) => a - b).join(',');
    if (flatSignature !== structuredSignature) {
      throw new Error('Os campos optionIds e selectedOptions informam montagens diferentes.');
    }
  }

  return uniquePositiveIds(structuredIds, 'A montagem');
}

function resolveLegacyIds(product: ProductWithOptions, ingredientIds: number[]) {
  return ingredientIds.map((ingredientId) => {
    const matches = (product.optionGroups || []).flatMap((group) =>
      group.options.filter((option) => option.ingredientId === ingredientId),
    );
    if (matches.length !== 1) {
      throw new Error(`Ingrediente legado inválido ou ambíguo para ${product.name}.`);
    }
    return matches[0].id;
  });
}

/**
 * Fonte de verdade do preço e da montagem. O cliente informa somente ids;
 * nomes e valores são sempre recuperados da configuração do restaurante.
 */
export function resolveOrderItemCustomizations(
  product: ProductWithOptions,
  selection: OrderItemOptionSelection = {},
) {
  const activeGroups = (product.optionGroups || []).filter((group) => group.active);

  if (!activeGroups.length) {
    return resolveLegacyProductIngredients(product, selection.ingredientIds);
  }

  activeGroups.forEach((group) => {
    if (group.restaurantId !== product.restaurantId) {
      throw new Error(`A configuração de ${product.name} pertence a outro restaurante.`);
    }
  });

  const legacyIds = uniquePositiveIds(selection.ingredientIds, 'A montagem antiga');
  let selectedIds = resolveExplicitOptionIds(product, selection);
  if (!selectedIds.length && legacyIds.length) {
    selectedIds = resolveLegacyIds(product, legacyIds);
  }

  const allActiveOptions = activeGroups.flatMap((group) =>
    group.options.filter(
      (option) =>
        option.active &&
        option.ingredient.active &&
        option.ingredient.restaurantId === product.restaurantId,
    ),
  );
  const allActiveOptionIds = new Set(allActiveOptions.map((option) => option.id));
  if (selectedIds.some((id) => !allActiveOptionIds.has(id))) {
    throw new Error(`Uma opção selecionada está indisponível para ${product.name}.`);
  }

  const customizations = activeGroups.map((group) => {
    const availableOptions = group.options.filter(
      (option) =>
        option.active &&
        option.ingredient.active &&
        option.ingredient.restaurantId === product.restaurantId,
    );
    const selected = availableOptions.filter((option) => selectedIds.includes(option.id));
    const minimum = group.required ? Math.max(1, group.minSelections) : group.minSelections;
    const maximum = group.selectionType === 'SINGLE' ? 1 : group.maxSelections;

    if (availableOptions.length < minimum) {
      throw new Error(`O grupo ${group.name} está sem opções suficientes. Avise o restaurante.`);
    }
    if (selected.length < minimum) {
      throw new Error(
        `Escolha pelo menos ${minimum} ${minimum === 1 ? 'opção' : 'opções'} em ${group.name}.`,
      );
    }
    if (selected.length > maximum) {
      throw new Error(
        `Escolha no máximo ${maximum} ${maximum === 1 ? 'opção' : 'opções'} em ${group.name}.`,
      );
    }

    return {
      groupId: group.id,
      groupName: group.name,
      selectionType: group.selectionType,
      minSelections: minimum,
      maxSelections: maximum,
      options: selected.map((option) => ({
        optionId: option.id,
        ingredientId: option.ingredient.id,
        name: option.ingredient.name,
        price: money(option.ingredient.price),
      })),
    };
  });

  const selectedOptions = customizations.flatMap((group) => group.options);
  const additionalPrice = selectedOptions.reduce((total, option) => total + option.price, 0);
  const price = money(money(product.price) + additionalPrice);

  return {
    price,
    ingredients: selectedOptions.map((option) => ({
      id: option.ingredientId,
      name: option.name,
      price: option.price,
    })),
    customizations,
  };
}

function resolveLegacyProductIngredients(
  product: ProductWithOptions,
  ingredientIds: number[] = [],
) {
  const selectedIds = uniquePositiveIds(ingredientIds, 'A montagem');
  const available = product.ingredients.filter((ingredient) => ingredient.active);

  if (!available.length) {
    throw new Error(`${product.name} ainda não possui opções de montagem configuradas.`);
  }

  const selected = selectedIds.map((id) =>
    available.find((ingredient) => ingredient.id === id),
  );
  if (selected.some((ingredient) => !ingredient)) {
    throw new Error(`Ingrediente inválido para ${product.name}.`);
  }

  const requiredIds = available
    .filter((ingredient) => ingredient.required)
    .map((ingredient) => ingredient.id);
  if (requiredIds.some((id) => !selectedIds.includes(id))) {
    throw new Error(`Selecione os ingredientes obrigatórios de ${product.name}.`);
  }

  const ingredients = selected.map((ingredient) => ({
    id: ingredient!.id,
    name: ingredient!.name,
    price: money(ingredient!.price),
  }));
  return {
    price: money(money(product.price) + ingredients.reduce((sum, item) => sum + item.price, 0)),
    ingredients,
    customizations: [],
  };
}

/** Compatibilidade temporária para consumidores do modelo antigo. */
export function resolveOrderItemIngredients(
  product: ProductWithOptions,
  ingredientIds: number[] = [],
) {
  return resolveOrderItemCustomizations(product, { ingredientIds });
}
