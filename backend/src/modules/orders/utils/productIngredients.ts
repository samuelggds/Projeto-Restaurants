import { resolveProductBasePricing, roundMoney } from '../../products/utils/productDiscount.js';

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
  restaurantId?: number;
  active: boolean;
  ingredientId: number;
  additionalPrice?: unknown;
  pricingMode?: 'ADDITIVE' | 'ABSOLUTE';
  absolutePrice?: unknown | null;
  allowQuantity?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  defaultQuantity?: number;
  defaultSelected?: boolean;
  locked?: boolean;
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

type ProductCompositionItem = {
  id: number;
  restaurantId: number;
  ingredientId: number;
  removable: boolean;
  active: boolean;
  ingredient: CatalogIngredient;
};

type ProductPortionConfiguration = {
  optionGroupId?: number | null;
  enabled: boolean;
  minPortions: number;
  maxPortions: number;
  pricingStrategy: 'ADD' | 'HIGHEST' | 'AVERAGE' | 'PROPORTIONAL' | 'FIXED';
  allowPortionObservations: boolean;
};

type ProductWithOptions = {
  id?: number;
  restaurantId?: number;
  name: string;
  saleMode: 'COMPLETE' | 'BUILDABLE';
  configurationVersion?: number;
  price: unknown;
  ingredients: LegacyIngredient[];
  optionGroups?: ProductOptionGroup[];
  compositionItems?: ProductCompositionItem[];
  portionConfiguration?: ProductPortionConfiguration | null;
  discount?: {
    kind: string;
    value: unknown;
    label?: string | null;
    active: boolean;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
  } | null;
};

export type OrderItemOptionSelection = {
  ingredientIds?: number[];
  optionIds?: number[];
  selectedOptions?: Array<{ groupId?: number; optionIds?: number[] }>;
  optionQuantities?: Array<{ optionId?: number; quantity?: number }>;
  removedCompositionItemIds?: number[];
  portions?: Array<{ optionId?: number; observation?: string | null }>;
  configurationVersion?: number;
};

type OrderItemSnapshotInput = OrderItemOptionSelection & {
  quantity?: number;
  observation?: string | null;
};

function money(value: unknown) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error('O produto possui um valor de opção inválido.');
  }
  return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

function cents(value: unknown) {
  return Math.round(money(value) * 100);
}

function fromCents(value: number) {
  return Math.round(value) / 100;
}

function optionUnitPrice(option: ProductOption) {
  if (option.pricingMode === 'ABSOLUTE') {
    return money(option.absolutePrice);
  }
  return money(option.additionalPrice ?? option.ingredient.price);
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

function resolveOptionQuantities(
  selectedOptions: ProductOption[],
  quantities: OrderItemOptionSelection['optionQuantities'],
) {
  const requested = new Map<number, number>();
  (quantities || []).forEach((entry) => {
    const optionId = Number(entry.optionId);
    const quantity = Number(entry.quantity);
    if (!Number.isInteger(optionId) || optionId <= 0 || !Number.isInteger(quantity)) {
      throw new Error('A montagem contém uma quantidade inválida.');
    }
    if (requested.has(optionId)) {
      throw new Error('A montagem contém quantidade repetida para a mesma opção.');
    }
    requested.set(optionId, quantity);
  });

  const selectedIds = new Set(selectedOptions.map((option) => option.id));
  if ([...requested.keys()].some((optionId) => !selectedIds.has(optionId))) {
    throw new Error('A montagem informou quantidade para uma opção não selecionada.');
  }

  return new Map(
    selectedOptions.map((option) => {
      const minimum = option.allowQuantity ? Number(option.minQuantity ?? 1) : 1;
      const maximum = option.allowQuantity ? Number(option.maxQuantity ?? 1) : 1;
      const defaultQuantity = option.allowQuantity ? Number(option.defaultQuantity ?? minimum) : 1;
      const quantity = requested.get(option.id) ?? defaultQuantity;
      if (!Number.isInteger(quantity) || quantity < minimum || quantity > maximum) {
        throw new Error(
          `A quantidade de ${option.ingredient.name} deve ficar entre ${minimum} e ${maximum}.`,
        );
      }
      return [option.id, quantity] as const;
    }),
  );
}

function resolveComposition(
  product: ProductWithOptions,
  removedCompositionItemIds: number[] | undefined,
) {
  const removedIds = uniquePositiveIds(removedCompositionItemIds, 'A lista de itens removidos');
  const configuredItems = (product.compositionItems || []).filter((item) => item.active);
  if (
    configuredItems.some(
      (item) =>
        item.restaurantId !== product.restaurantId ||
        item.ingredient.restaurantId !== product.restaurantId,
    )
  ) {
    throw new Error(`A composição de ${product.name} pertence a outro restaurante.`);
  }
  const unavailableRequiredItem = configuredItems.find(
    (item) => !item.ingredient.active && !item.removable,
  );
  if (unavailableRequiredItem) {
    throw new Error(
      `${product.name} está indisponível porque ${unavailableRequiredItem.ingredient.name} faz parte da composição.`,
    );
  }
  const activeItems = configuredItems.filter((item) => item.ingredient.active);
  const byId = new Map(activeItems.map((item) => [item.id, item]));

  removedIds.forEach((itemId) => {
    const item = byId.get(itemId);
    if (!item) {
      throw new Error(`Um item removido está indisponível para ${product.name}.`);
    }
    if (!item.removable) {
      throw new Error(`${item.ingredient.name} faz parte da receita e não pode ser removido.`);
    }
  });

  const removedSet = new Set(removedIds);
  const composition = activeItems.map((item) => ({
    compositionItemId: item.id,
    ingredientId: item.ingredientId,
    name: item.ingredient.name,
    removable: item.removable,
    removed: removedSet.has(item.id),
  }));

  return {
    composition,
    removedComposition: composition.filter((item) => item.removed),
  };
}

function resolvePortions(
  product: ProductWithOptions,
  activeGroups: ProductOptionGroup[],
  portionsInput: OrderItemOptionSelection['portions'],
) {
  const configuration = product.portionConfiguration;
  const requestedPortions = portionsInput || [];
  if (!configuration?.enabled) {
    if (requestedPortions.length > 0) {
      throw new Error(`${product.name} não aceita divisão em porções.`);
    }
    return { portions: [], additiveCents: 0, absoluteCents: null as number | null };
  }

  const portionCount = requestedPortions.length;
  if (portionCount < configuration.minPortions || portionCount > configuration.maxPortions) {
    throw new Error(
      `${product.name} deve ter entre ${configuration.minPortions} e ${configuration.maxPortions} porções.`,
    );
  }

  const group = activeGroups.find((candidate) => candidate.id === configuration.optionGroupId);
  if (!group || group.restaurantId !== product.restaurantId) {
    throw new Error(`A configuração de porções de ${product.name} está incompleta.`);
  }
  const availableOptions = group.options.filter(
    (option) =>
      option.active &&
      option.ingredient.active &&
      option.ingredient.restaurantId === product.restaurantId &&
      (option.restaurantId === undefined || option.restaurantId === product.restaurantId),
  );

  const portions = requestedPortions.map((portion, index) => {
    const optionId = Number(portion.optionId);
    if (!Number.isInteger(optionId) || optionId <= 0) {
      throw new Error(`A porção ${index + 1} possui uma opção inválida.`);
    }
    const option = availableOptions.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new Error(`A opção da porção ${index + 1} está indisponível para ${product.name}.`);
    }
    const observation = String(portion.observation || '').trim();
    if (observation && !configuration.allowPortionObservations) {
      throw new Error(`${product.name} não aceita observações específicas por porção.`);
    }
    if (observation.length > 300) {
      throw new Error('A observação de cada porção deve ter no máximo 300 caracteres.');
    }
    const unitPrice = optionUnitPrice(option);
    return {
      portion: index + 1,
      fraction: `1/${portionCount}`,
      fractionNumerator: 1,
      fractionDenominator: portionCount,
      optionId: option.id,
      ingredientId: option.ingredient.id,
      optionName: option.ingredient.name,
      pricingMode: option.pricingMode ?? 'ADDITIVE',
      unitPrice,
      observation: observation || null,
    };
  });

  const pricingModes = new Set(portions.map((portion) => portion.pricingMode));
  if (pricingModes.size > 1 && configuration.pricingStrategy !== 'FIXED') {
    throw new Error('As opções por porção precisam usar o mesmo modo de preço.');
  }
  const usesAbsolutePrice = portions[0]?.pricingMode === 'ABSOLUTE';
  if (usesAbsolutePrice && configuration.pricingStrategy === 'ADD') {
    throw new Error('A estratégia ADD não pode somar opções com preço final absoluto.');
  }

  const optionCents = portions.map((portion) => cents(portion.unitPrice));
  let calculatedCents = 0;
  switch (configuration.pricingStrategy) {
    case 'ADD':
      calculatedCents = optionCents.reduce((sum, value) => sum + value, 0);
      break;
    case 'HIGHEST':
      calculatedCents = Math.max(...optionCents);
      break;
    case 'AVERAGE':
    case 'PROPORTIONAL':
      calculatedCents = Math.round(
        optionCents.reduce((sum, value) => sum + value, 0) / optionCents.length,
      );
      break;
    case 'FIXED':
      calculatedCents = 0;
      break;
  }

  return {
    portions,
    additiveCents: usesAbsolutePrice ? 0 : calculatedCents,
    absoluteCents:
      usesAbsolutePrice && configuration.pricingStrategy !== 'FIXED' ? calculatedCents : null,
  };
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
  if (
    selection.configurationVersion !== undefined &&
    Number(selection.configurationVersion) !== Number(product.configurationVersion ?? 1)
  ) {
    throw new Error('A configuração deste produto foi atualizada. Revise suas escolhas.');
  }

  const hasCustomizationIntent = Boolean(
    selection.ingredientIds?.length ||
    selection.optionIds?.length ||
    selection.selectedOptions?.some((group) => group.optionIds?.length) ||
    selection.optionQuantities?.length ||
    selection.removedCompositionItemIds?.length ||
    selection.portions?.length,
  );
  if (product.saleMode === 'COMPLETE') {
    if (hasCustomizationIntent) {
      throw new Error(`${product.name} é vendido sem etapas de montagem.`);
    }
    return {
      price: money(product.price),
      ingredients: [],
      customizations: [],
    };
  }

  const activeGroups = (product.optionGroups || []).filter((group) => group.active);
  const composition = resolveComposition(product, selection.removedCompositionItemIds);
  const portionGroupId = product.portionConfiguration?.enabled
    ? product.portionConfiguration.optionGroupId
    : null;
  const regularGroups = activeGroups.filter((group) => group.id !== portionGroupId);

  if (!activeGroups.length) {
    // Sacolas criadas durante a migração para grupos guardavam os ids legados
    // em optionIds. Aceitar esse formato mantém pedidos antigos finalizáveis.
    const hasLegacyConfiguration = product.ingredients.some((ingredient) => ingredient.active);
    if (hasLegacyConfiguration) {
      const legacy = resolveLegacyProductIngredients(
        product,
        selection.ingredientIds?.length ? selection.ingredientIds : selection.optionIds,
      );
      return {
        ...legacy,
        ...(composition.composition.length > 0 ? composition : {}),
      };
    }
    if (!composition.composition.some((item) => item.removable)) {
      throw new Error(`${product.name} ainda não possui opções de montagem configuradas.`);
    }
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

  const allActiveOptions = regularGroups.flatMap((group) =>
    group.options.filter(
      (option) =>
        option.active &&
        option.ingredient.active &&
        option.ingredient.restaurantId === product.restaurantId &&
        (option.restaurantId === undefined || option.restaurantId === product.restaurantId),
    ),
  );
  const allActiveOptionIds = new Set(allActiveOptions.map((option) => option.id));
  if (selectedIds.some((id) => !allActiveOptionIds.has(id))) {
    throw new Error(`Uma opção selecionada está indisponível para ${product.name}.`);
  }

  const groupSelections = regularGroups.map((group) => {
    const availableOptions = group.options.filter(
      (option) =>
        option.active &&
        option.ingredient.active &&
        option.ingredient.restaurantId === product.restaurantId &&
        (option.restaurantId === undefined || option.restaurantId === product.restaurantId),
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

    const missingLockedOption = availableOptions.find(
      (option) => option.locked && !selectedIds.includes(option.id),
    );
    if (missingLockedOption) {
      throw new Error(`${missingLockedOption.ingredient.name} é uma opção fixa de ${group.name}.`);
    }

    return { group, selected, minimum, maximum };
  });

  const selectedCatalogOptions = groupSelections.flatMap((entry) => entry.selected);
  const optionQuantities = resolveOptionQuantities(
    selectedCatalogOptions,
    selection.optionQuantities,
  );
  const customizations = groupSelections.map(({ group, selected, minimum, maximum }) => {
    return {
      groupId: group.id,
      groupName: group.name,
      selectionType: group.selectionType,
      minSelections: minimum,
      maxSelections: maximum,
      options: selected.map((option) => {
        const quantity = optionQuantities.get(option.id) ?? 1;
        const unitPrice = optionUnitPrice(option);
        const totalPrice = money(unitPrice * quantity);
        return {
          optionId: option.id,
          ingredientId: option.ingredient.id,
          name: option.ingredient.name,
          pricingMode: option.pricingMode ?? 'ADDITIVE',
          unitPrice,
          quantity,
          price: totalPrice,
          totalPrice,
        };
      }),
    };
  });

  const selectedOptions = customizations.flatMap((group) => group.options);
  const absoluteOptions = selectedOptions.filter((option) => option.pricingMode === 'ABSOLUTE');
  if (absoluteOptions.length > 1) {
    throw new Error('A montagem selecionou mais de uma opção que define o preço base.');
  }
  const portions = resolvePortions(product, activeGroups, selection.portions);
  if (absoluteOptions.length && portions.absoluteCents !== null) {
    throw new Error('A montagem possui mais de uma etapa definindo o preço base.');
  }
  const baseCents =
    portions.absoluteCents ??
    (absoluteOptions.length ? cents(absoluteOptions[0].unitPrice) : cents(product.price));
  const additionalCents = selectedOptions
    .filter((option) => option.pricingMode === 'ADDITIVE')
    .reduce((total, option) => total + cents(option.totalPrice), portions.additiveCents);
  const price = fromCents(baseCents + additionalCents);

  return {
    price,
    ingredients: selectedOptions.map((option) => ({
      id: option.ingredientId,
      name: option.name,
      price: option.price,
    })),
    customizations,
    ...(composition.composition.length > 0 ? composition : {}),
    ...(portions.portions.length > 0 ? { portions: portions.portions } : {}),
  };
}

/**
 * Gera o snapshot imutável que será salvo no OrderItem. Assim, alterações
 * futuras no catálogo não mudam o que a cozinha recebeu no pedido.
 */
export function buildOrderItemCustomizationSnapshot(
  product: ProductWithOptions & { id: number },
  item: OrderItemSnapshotInput,
) {
  const resolved = resolveOrderItemCustomizations(product, item);
  const basePricing = resolveProductBasePricing(product);
  const originalUnitPrice = roundMoney(resolved.price);
  const unitDiscount = roundMoney(basePricing.discountAmount);
  const effectiveUnitPrice = roundMoney(Math.max(originalUnitPrice - unitDiscount, 0));
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Quantidade inválida para ${product.name}.`);
  }
  const observation = String(item.observation || '').trim();

  return {
    productId: product.id,
    quantity,
    price: effectiveUnitPrice,
    originalUnitPrice,
    unitDiscount,
    observation: observation || null,
    ingredients: resolved.ingredients,
    customizations: resolved.customizations,
    configurationSnapshot: {
      version: 2,
      configurationVersion: Number(product.configurationVersion ?? 1),
      composition: 'composition' in resolved ? resolved.composition : [],
      removedComposition: 'removedComposition' in resolved ? resolved.removedComposition : [],
      portions: 'portions' in resolved ? resolved.portions : [],
    },
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

  const selected = selectedIds.map((id) => available.find((ingredient) => ingredient.id === id));
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
