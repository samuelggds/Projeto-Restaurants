import { describe, expect, it } from 'vitest';
import {
  countProductsInCategory,
  filterAdminProducts,
  groupIngredientsByCategory,
  listIngredientCategories,
} from './adminCatalog';
import type { AdminIngredient, AdminProduct } from '../types';

const products = [
  { id: '1', name: 'Pizza de Calabresa', categoryId: 10 },
  { id: '2', name: 'Hambúrguer de frango', categoryId: 20 },
] as AdminProduct[];

describe('catálogo administrativo', () => {
  it('filtra por nome sem diferenciar maiúsculas e acentos já digitados', () => {
    expect(filterAdminProducts(products, 'pizza', '')).toEqual([products[0]]);
    expect(filterAdminProducts(products, 'HAMBÚRGUER', '')).toEqual([products[1]]);
  });

  it('combina nome e categoria', () => {
    expect(filterAdminProducts(products, 'frango', '20')).toEqual([products[1]]);
    expect(filterAdminProducts(products, 'frango', '10')).toEqual([]);
  });

  it('conta os produtos vinculados à categoria', () => {
    expect(countProductsInCategory(products, 10)).toBe(1);
    expect(countProductsInCategory(products, 99)).toBe(0);
  });
});

describe('categorias dos ingredientes', () => {
  const ingredients: AdminIngredient[] = [
    { id: 1, name: 'Bacon', price: 4, category: 'Adicionais', active: true },
    { id: 2, name: 'Massa fina', price: 0, category: 'Massas', active: true },
    { id: 3, name: 'Cheddar', price: 3, category: 'adicionais', active: true },
  ];

  it('lista sugestões sem duplicar categorias por diferença de caixa', () => {
    expect(listIngredientCategories(ingredients)).toEqual(['Adicionais', 'Massas']);
  });

  it('agrupa visualmente os ingredientes pela categoria preservada', () => {
    const groups = groupIngredientsByCategory(ingredients);
    expect(groups.map((group) => [group.category, group.ingredients.length])).toEqual([
      ['Adicionais', 2],
      ['Massas', 1],
    ]);
  });
});
