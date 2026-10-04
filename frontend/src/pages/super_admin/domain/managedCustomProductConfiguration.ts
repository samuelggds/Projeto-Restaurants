import type {
  AdminProduct,
  AdminProductOption,
  AdminProductOptionGroup,
  AdminProductPortionConfiguration,
} from '../../admin/types';

export type ManagedCustomizationType = 'HALF_HALF' | 'PORTIONS' | 'INGREDIENTS';

export type ManagedCustomConfigurationInput = {
  type: ManagedCustomizationType;
  selectedProductIds: number[];
  selectedIngredientIds: number[];
  additionalPrices: Record<number, number>;
  groupName: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  minPortions: number;
  maxPortions: number;
};

export type ManagedCustomConfiguration = {
  pricingMode: 'BASE' | 'HIGHEST_OPTION';
  optionGroups: AdminProductOptionGroup[];
  portionConfiguration: AdminProductPortionConfiguration | null;
};

function productOption(referenceProductId: number): AdminProductOption {
  return {
    referenceProductId,
    additionalPrice: 0,
    pricingMode: 'ABSOLUTE',
    absolutePrice: 0,
    allowQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    defaultSelected: false,
    locked: false,
    active: true,
  };
}

function ingredientOption(
  ingredientId: number,
  additionalPrice: number,
): AdminProductOption {
  return {
    ingredientId,
    additionalPrice,
    pricingMode: 'ADDITIVE',
    allowQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    defaultSelected: false,
    locked: false,
    active: true,
  };
}

function sameNumericSet(left: number[], right: number[]) {
  const normalizedLeft = [...new Set(left)].sort((a, b) => a - b);
  const normalizedRight = [...new Set(right)].sort((a, b) => a - b);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

function referenceProductIds(group: AdminProductOptionGroup | undefined) {
  return (group?.options || [])
    .flatMap((option) => (option.referenceProductId ? [Number(option.referenceProductId)] : []))
    .filter((id) => id > 0);
}

function ingredientIds(group: AdminProductOptionGroup | undefined) {
  return (group?.options || [])
    .flatMap((option) => (option.ingredientId ? [Number(option.ingredientId)] : []))
    .filter((id) => id > 0);
}

export function inferManagedCustomizationType(
  product: AdminProduct,
): ManagedCustomizationType {
  if (
    product.pricingMode === 'HIGHEST_OPTION' &&
    product.optionGroups?.some((group) =>
      group.options.some((option) => Boolean(option.referenceProductId)),
    )
  ) {
    return 'HALF_HALF';
  }
  if (product.portionConfiguration?.enabled) return 'PORTIONS';
  return 'INGREDIENTS';
}

export function isManagedSimpleCustomProduct(product: AdminProduct) {
  if (product.saleMode !== 'BUILDABLE' || product.compositionItems?.length) return false;
  const groups = product.optionGroups || [];
  if (!groups.length) return false;

  const type = inferManagedCustomizationType(product);
  if (type === 'HALF_HALF') {
    if (groups.length !== 2 || product.portionConfiguration?.enabled) return false;
    const firstIds = referenceProductIds(groups[0]);
    const secondIds = referenceProductIds(groups[1]);
    return (
      firstIds.length >= 2 &&
      firstIds.length === groups[0].options.length &&
      secondIds.length === groups[1].options.length &&
      sameNumericSet(firstIds, secondIds)
    );
  }

  if (type === 'PORTIONS') {
    if (groups.length !== 1 || !product.portionConfiguration?.enabled) return false;
    return (
      groups[0].name === product.portionConfiguration.optionGroupName &&
      ingredientIds(groups[0]).length === groups[0].options.length
    );
  }

  return (
    groups.length === 1 &&
    !product.portionConfiguration?.enabled &&
    ingredientIds(groups[0]).length === groups[0].options.length
  );
}

export function managedSelectedProductIds(product: AdminProduct | null) {
  if (!product) return [];
  return [
    ...new Set(
      (product.optionGroups || []).flatMap((group) => referenceProductIds(group)),
    ),
  ];
}

export function managedSelectedIngredientIds(product: AdminProduct | null) {
  if (!product) return [];
  const type = inferManagedCustomizationType(product);
  const group =
    type === 'PORTIONS'
      ? (product.optionGroups || []).find(
          (candidate) => candidate.name === product.portionConfiguration?.optionGroupName,
        )
      : product.optionGroups?.[0];
  return [...new Set(ingredientIds(group))];
}

export function managedAdditionalPrices(product: AdminProduct | null) {
  const prices: Record<number, number> = {};
  for (const group of product?.optionGroups || []) {
    for (const option of group.options) {
      if (option.ingredientId) {
        prices[Number(option.ingredientId)] = Number(option.additionalPrice ?? 0);
      }
    }
  }
  return prices;
}

export function buildManagedCustomProductConfiguration(
  input: ManagedCustomConfigurationInput,
): ManagedCustomConfiguration {
  if (input.type === 'HALF_HALF') {
    const options = [...new Set(input.selectedProductIds)].map(productOption);
    const makeGroup = (name: string): AdminProductOptionGroup => ({
      name,
      description: 'Escolha um sabor para esta metade.',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
      options: options.map((option) => ({ ...option })),
    });

    return {
      pricingMode: 'HIGHEST_OPTION',
      optionGroups: [makeGroup('Primeira metade'), makeGroup('Segunda metade')],
      portionConfiguration: null,
    };
  }

  const selectedIngredientIds = [...new Set(input.selectedIngredientIds)];
  const options = selectedIngredientIds.map((ingredientId) =>
    ingredientOption(ingredientId, Number(input.additionalPrices[ingredientId] ?? 0)),
  );
  const normalizedName = input.groupName.trim() || (input.type === 'PORTIONS' ? 'Porções' : 'Adicionais');

  if (input.type === 'PORTIONS') {
    return {
      pricingMode: 'BASE',
      optionGroups: [
        {
          name: normalizedName,
          description: 'Escolha uma opção para cada porção.',
          required: true,
          selectionType: 'SINGLE',
          minSelections: 1,
          maxSelections: 1,
          options,
        },
      ],
      portionConfiguration: {
        enabled: true,
        optionGroupName: normalizedName,
        minPortions: input.minPortions,
        maxPortions: input.maxPortions,
        pricingStrategy: 'HIGHEST',
        allowPortionObservations: true,
      },
    };
  }

  return {
    pricingMode: 'BASE',
    optionGroups: [
      {
        name: normalizedName,
        description: 'Escolha os ingredientes e adicionais desejados.',
        required: input.required,
        selectionType: input.maxSelections === 1 ? 'SINGLE' : 'MULTIPLE',
        minSelections: input.required ? input.minSelections : 0,
        maxSelections: input.maxSelections,
        options,
      },
    ],
    portionConfiguration: null,
  };
}
