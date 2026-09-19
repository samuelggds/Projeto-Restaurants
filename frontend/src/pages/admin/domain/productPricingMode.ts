import type { AdminProductOptionGroup, AdminProductPortionConfiguration } from '../types';
export function productPricingConfigurationError(
  pricingMode: 'BASE' | 'HIGHEST_OPTION',
  groups: AdminProductOptionGroup[],
  portionConfiguration: AdminProductPortionConfiguration | null,
) {
  if (pricingMode === 'HIGHEST_OPTION') {
    const hasRequiredProducts = groups.some((group) => {
      const options = group.options.filter((option) => option.active !== false);
      return (
        (group.required || group.minSelections > 0) &&
        options.length > 0 &&
        options.every((option) => option.referenceProductId)
      );
    });
    if (!hasRequiredProducts)
      return 'No meio a meio, adicione uma etapa obrigatória com os produtos disponíveis para escolha.';
    if (
      portionConfiguration?.enabled ||
      groups.some((group) =>
        group.options.some(
          (option) =>
            option.active !== false &&
            !option.referenceProductId &&
            option.pricingMode === 'ABSOLUTE',
        ),
      )
    ) {
      return 'O meio a meio usa o maior preço dos produtos. Remova outras regras de preço por porção ou preço final.';
    }
  }
  if (
    portionConfiguration?.enabled &&
    !groups.some((group) => group.name === portionConfiguration.optionGroupName)
  ) {
    return 'Escolha uma etapa existente para definir as opções de cada porção.';
  }
  if (
    portionConfiguration?.enabled &&
    portionConfiguration.minPortions > portionConfiguration.maxPortions
  ) {
    return 'O mínimo de porções não pode ser maior que o máximo.';
  }
  return '';
}
