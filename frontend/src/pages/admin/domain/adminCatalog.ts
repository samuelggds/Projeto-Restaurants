import type { AdminIngredient, AdminProduct } from '../types';

export function filterAdminProducts(products: AdminProduct[], search: string, categoryId: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
  return products.filter((product) => {
    if (categoryId && String(product.categoryId) !== categoryId) return false;
    return !normalizedSearch || product.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch);
  });
}

export function countProductsInCategory(products: AdminProduct[], categoryId: number) {
  return products.filter((product) => product.categoryId === categoryId).length;
}

export function listIngredientCategories(ingredients: AdminIngredient[]) {
  const categories = new Map<string, string>();
  ingredients.forEach((ingredient) => {
    const category = ingredient.category.trim();
    const normalized = category.toLocaleLowerCase('pt-BR');
    if (category && !categories.has(normalized)) categories.set(normalized, category);
  });
  return Array.from(categories.values()).sort((first, second) => first.localeCompare(second, 'pt-BR'));
}

export function groupIngredientsByCategory(ingredients: AdminIngredient[]) {
  return listIngredientCategories(ingredients).map((category) => ({
    category,
    ingredients: ingredients.filter(
      (ingredient) =>
        ingredient.category.trim().toLocaleLowerCase('pt-BR') ===
        category.toLocaleLowerCase('pt-BR'),
    ),
  }));
}
