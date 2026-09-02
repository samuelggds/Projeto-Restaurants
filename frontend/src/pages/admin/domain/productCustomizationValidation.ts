import type { AdminIngredient, AdminProductOptionGroup } from '../types';

export type IngredientDraft = Pick<AdminIngredient, 'name' | 'price' | 'category'> & {
  id?: number;
};

export function validateIngredientDraft(draft: IngredientDraft, ingredients: AdminIngredient[]) {
  const errors: string[] = [];
  const normalizedName = draft.name.trim().toLocaleLowerCase('pt-BR');
  const normalizedCategory = draft.category.trim();

  if (!normalizedName) errors.push('Informe o nome do ingrediente.');
  if (draft.name.trim().length > 80) {
    errors.push('O nome do ingrediente deve ter no máximo 80 caracteres.');
  }
  if (!normalizedCategory) errors.push('Informe a categoria do ingrediente.');
  if (normalizedCategory.length > 60) {
    errors.push('A categoria deve ter no máximo 60 caracteres.');
  }
  if (!Number.isFinite(draft.price) || draft.price < 0) {
    errors.push('Informe um valor adicional igual ou maior que zero.');
  }
  if (draft.price > 9999) {
    errors.push('O valor adicional deve ser menor que R$ 10.000,00.');
  }
  const duplicated = ingredients.some(
    (ingredient) =>
      ingredient.id !== draft.id &&
      ingredient.name.trim().toLocaleLowerCase('pt-BR') === normalizedName,
  );
  if (normalizedName && duplicated) errors.push('Já existe um ingrediente com esse nome.');

  return errors;
}

export function normalizeOptionGroup(group: AdminProductOptionGroup): AdminProductOptionGroup {
  const uniqueOptions = Array.from(
    new Map(group.options.map((option) => [option.ingredientId, option])).values(),
  );
  const optionCount = uniqueOptions.length;
  const minSelections = group.required ? Math.max(1, group.minSelections) : 0;
  const maxSelections = group.selectionType === 'SINGLE' ? 1 : group.maxSelections;

  return {
    ...group,
    name: group.name.trim(),
    description: group.description?.trim() || '',
    minSelections: Math.max(0, Math.min(minSelections, optionCount)),
    maxSelections: Math.max(0, Math.min(maxSelections, optionCount)),
    options: uniqueOptions,
  };
}

export function validateOptionGroups(
  groups: AdminProductOptionGroup[],
  ingredients: AdminIngredient[],
) {
  const errors: string[] = [];
  const activeIngredientIds = new Set(
    ingredients.filter((ingredient) => ingredient.active).map((ingredient) => ingredient.id),
  );
  const names = new Set<string>();

  if (!groups.length) {
    return ['Adicione ao menos uma etapa de escolha ao produto.'];
  }

  groups.forEach((rawGroup, index) => {
    const group = normalizeOptionGroup(rawGroup);
    const label = group.name || `Grupo ${index + 1}`;
    const normalizedName = group.name.toLocaleLowerCase('pt-BR');

    if (!group.name) errors.push(`Informe o nome do grupo ${index + 1}.`);
    if (group.name.length > 60) errors.push(`${label}: use um nome de até 60 caracteres.`);
    if (normalizedName && names.has(normalizedName)) {
      errors.push(`A etapa “${label}” está duplicada.`);
    }
    if (normalizedName) names.add(normalizedName);

    if (!group.options.length) errors.push(`${label}: selecione ao menos uma opção.`);
    if (group.options.some((option) => !activeIngredientIds.has(option.ingredientId))) {
      errors.push(`${label}: remova opções inativas ou indisponíveis.`);
    }
    if (!Number.isInteger(group.minSelections) || group.minSelections < 0) {
      errors.push(`${label}: o mínimo de escolhas é inválido.`);
    }
    if (!Number.isInteger(group.maxSelections) || group.maxSelections < 1) {
      errors.push(`${label}: o máximo de escolhas deve ser pelo menos 1.`);
    }
    if (group.required && group.minSelections < 1) {
      errors.push(`${label}: uma etapa obrigatória precisa exigir ao menos uma escolha.`);
    }
    if (group.selectionType === 'SINGLE' && group.maxSelections !== 1) {
      errors.push(`${label}: grupos de escolha única permitem somente uma opção.`);
    }
    if (group.minSelections > group.maxSelections) {
      errors.push(`${label}: o mínimo não pode ser maior que o máximo.`);
    }
    if (group.maxSelections > group.options.length) {
      errors.push(`${label}: o máximo não pode superar as opções disponíveis.`);
    }
    const activeOptions = group.options.filter((option) => option.active !== false);
    if (group.maxSelections > activeOptions.length) {
      errors.push(`${label}: o máximo não pode superar as opções ativas.`);
    }
    const initiallySelectedOptions = activeOptions.filter(
      (option) => option.defaultSelected || option.locked,
    );
    if (initiallySelectedOptions.length > group.maxSelections) {
      errors.push(`${label}: as opções que já vêm selecionadas não podem superar o limite.`);
    }
    group.options.forEach((option) => {
      const optionName =
        ingredients.find((ingredient) => ingredient.id === option.ingredientId)?.name ||
        `Opção #${option.ingredientId}`;
      const additionalPrice = Number(option.additionalPrice ?? 0);
      if (!Number.isFinite(additionalPrice) || additionalPrice < 0 || additionalPrice > 9999) {
        errors.push(`${label} · ${optionName}: informe um acréscimo válido.`);
      }
      if (
        option.pricingMode === 'ABSOLUTE' &&
        (option.absolutePrice === null ||
          option.absolutePrice === undefined ||
          !Number.isFinite(Number(option.absolutePrice)) ||
          Number(option.absolutePrice) < 0)
      ) {
        errors.push(`${label} · ${optionName}: informe o preço final desta escolha.`);
      }
      const minimum = Number(option.minQuantity ?? 1);
      const maximum = Number(option.maxQuantity ?? 1);
      const initial = Number(option.defaultQuantity ?? 1);
      if (
        !Number.isInteger(minimum) ||
        !Number.isInteger(maximum) ||
        !Number.isInteger(initial) ||
        minimum < 1 ||
        maximum > 99 ||
        minimum > maximum ||
        initial < minimum ||
        initial > maximum
      ) {
        errors.push(`${label} · ${optionName}: revise as quantidades mínima, inicial e máxima.`);
      }
      if (!option.allowQuantity && (minimum !== 1 || maximum !== 1 || initial !== 1)) {
        errors.push(`${label} · ${optionName}: ative quantidade para usar valores maiores que 1.`);
      }
      if (option.locked && !option.defaultSelected) {
        errors.push(`${label} · ${optionName}: uma seleção fixa precisa vir pré-selecionada.`);
      }
    });
  });

  return errors;
}
