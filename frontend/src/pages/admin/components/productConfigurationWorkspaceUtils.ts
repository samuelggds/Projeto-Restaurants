import type {
  AdminIngredient,
  AdminProduct,
  AdminProductOptionGroup,
} from '../types';

export const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function customerSelectionHint(group: AdminProductOptionGroup) {
  if (group.selectionType === 'SINGLE') return 'Escolha 1 opção';
  if (group.minSelections > 0 && group.minSelections !== group.maxSelections) {
    return `Escolha de ${group.minSelections} até ${group.maxSelections}`;
  }
  if (group.minSelections > 0) return `Escolha pelo menos ${group.minSelections}`;
  return `Escolha até ${group.maxSelections}`;
}

export function customerOptionPrice(
  option: AdminProductOptionGroup['options'][number],
  ingredient: AdminIngredient | undefined,
  referenceProduct?: AdminProduct,
) {
  if (option.referenceProductId && referenceProduct) {
    return money(Number(referenceProduct.price || 0));
  }
  if (option.pricingMode === 'ABSOLUTE') {
    return `Preço final ${money(Number(option.absolutePrice ?? option.additionalPrice ?? 0))}`;
  }
  const additionalPrice = Number(option.additionalPrice ?? ingredient?.price ?? 0);
  return additionalPrice > 0 ? `+ ${money(additionalPrice)}` : 'Incluso';
}
