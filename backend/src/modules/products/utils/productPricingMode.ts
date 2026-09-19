type PricingConfiguration = {
  pricingMode?: 'BASE' | 'HIGHEST_OPTION';
  saleMode?: 'COMPLETE' | 'BUILDABLE';
  optionGroups?: Array<{
    active?: boolean;
    required?: boolean;
    minSelections?: number;
    options?: Array<{
      active?: boolean;
      referenceProductId?: number | null;
      pricingMode?: string;
    }>;
  }>;
  portionConfiguration?: { enabled?: boolean } | null;
};

// Validate the effective configuration, including persisted fields on partial updates.
export function validateDynamicProductPricing(configuration: PricingConfiguration) {
  if (configuration.pricingMode !== 'HIGHEST_OPTION') return;
  if (configuration.saleMode !== 'BUILDABLE') {
    throw new Error('O preço meio a meio exige um produto personalizável.');
  }
  const groups = (configuration.optionGroups || []).filter((group) => group.active !== false);
  const hasRequiredProducts = groups.some((group) => {
    const options = (group.options || []).filter((option) => option.active !== false);
    return (
      (group.required || (group.minSelections ?? 0) > 0) &&
      options.length > 0 &&
      options.every((option) => Boolean(option.referenceProductId))
    );
  });
  if (!hasRequiredProducts) {
    throw new Error(
      'No meio a meio, adicione uma etapa obrigatória com os produtos disponíveis para escolha.',
    );
  }
  if (
    configuration.portionConfiguration?.enabled ||
    groups.some((group) =>
      (group.options || []).some(
        (option) =>
          option.active !== false &&
          !option.referenceProductId &&
          option.pricingMode === 'ABSOLUTE',
      ),
    )
  ) {
    throw new Error(
      'O meio a meio usa o maior preço dos produtos. Remova outras regras de preço por porção ou preço final.',
    );
  }
}
