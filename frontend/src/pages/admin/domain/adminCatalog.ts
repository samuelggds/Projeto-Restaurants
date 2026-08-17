import type { AdminProduct } from '../types';

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
