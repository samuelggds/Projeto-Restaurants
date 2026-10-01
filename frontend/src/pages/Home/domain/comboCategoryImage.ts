import type { HomeCategory, HomeProduct } from '../types';

export function resolveComboCategoryImage(categories: HomeCategory[], combos: HomeProduct[]) {
  const comboCategory = categories.find(
    (category) => category.name.trim().toLocaleLowerCase('pt-BR') === 'combos',
  );
  return comboCategory?.image || combos[0]?.image || '';
}
