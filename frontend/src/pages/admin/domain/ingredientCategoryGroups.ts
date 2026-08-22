import type {
  AdminIngredient,
  AdminProductOption,
  AdminProductOptionGroup,
} from '../types';

export const MIXED_INGREDIENT_CATEGORY = '__mixed_ingredient_categories__';

export type IngredientCategorySection = {
  key: string;
  category: string;
  ingredients: AdminIngredient[];
};

export type InferredIngredientCategory = {
  value: string;
  categories: string[];
  missingIngredientIds: number[];
};

export function ingredientCategoryKey(value: unknown) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function displayIngredientCategory(value: unknown) {
  return String(value || '').trim() || 'Sem categoria';
}

export function groupIngredientsByCategory(
  ingredients: AdminIngredient[],
): IngredientCategorySection[] {
  const grouped = new Map<string, IngredientCategorySection>();
  ingredients.forEach((ingredient) => {
    const category = displayIngredientCategory(ingredient.category);
    const key = ingredientCategoryKey(category);
    const current = grouped.get(key);
    if (current) current.ingredients.push(ingredient);
    else grouped.set(key, { key, category, ingredients: [ingredient] });
  });

  return [...grouped.values()]
    .map((section) => ({
      ...section,
      ingredients: [...section.ingredients].sort((first, second) =>
        first.name.localeCompare(second.name, 'pt-BR'),
      ),
    }))
    .sort((first, second) => first.category.localeCompare(second.category, 'pt-BR'));
}

export function listIngredientCategories(ingredients: AdminIngredient[]) {
  return groupIngredientsByCategory(ingredients).map((section) => section.category);
}

export function ingredientBelongsToCategory(
  ingredient: AdminIngredient,
  category: string,
) {
  return ingredientCategoryKey(displayIngredientCategory(ingredient.category)) ===
    ingredientCategoryKey(category);
}

export function inferGroupIngredientCategory(
  group: Pick<AdminProductOptionGroup, 'options'>,
  ingredients: AdminIngredient[],
): InferredIngredientCategory {
  if (!group.options.length) return { value: '', categories: [], missingIngredientIds: [] };

  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const canonicalCategories = new Map(
    groupIngredientsByCategory(ingredients).map((section) => [section.key, section.category]),
  );
  const missingIngredientIds: number[] = [];
  const categoryMap = new Map<string, string>();
  group.options.forEach((option) => {
    const ingredient = byId.get(option.ingredientId);
    if (!ingredient) {
      missingIngredientIds.push(option.ingredientId);
      return;
    }
    const category = displayIngredientCategory(ingredient.category);
    const categoryKey = ingredientCategoryKey(category);
    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, canonicalCategories.get(categoryKey) || category);
    }
  });
  const categories = [...categoryMap.values()].sort((first, second) =>
    first.localeCompare(second, 'pt-BR'),
  );

  return {
    value:
      categories.length === 1 && !missingIngredientIds.length
        ? categories[0]
        : MIXED_INGREDIENT_CATEGORY,
    categories,
    missingIngredientIds,
  };
}

export function incompatibleOptionsForCategory(
  options: AdminProductOption[],
  ingredients: AdminIngredient[],
  category: string,
) {
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  return options.filter((option) => {
    const ingredient = byId.get(option.ingredientId);
    return !ingredient || !ingredientBelongsToCategory(ingredient, category);
  });
}
