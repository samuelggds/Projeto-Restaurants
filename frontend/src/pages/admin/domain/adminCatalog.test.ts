import { describe, expect, it } from 'vitest';
import { countProductsInCategory, filterAdminProducts } from './adminCatalog';
import type { AdminProduct } from '../types';

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
