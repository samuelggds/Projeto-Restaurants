import { describe, expect, it } from 'vitest';
import { isProductUnavailable, toPositiveInteger } from './productAvailability';

describe('disponibilidade do cardápio público', () => {
  it('indisponibiliza produto inativo ou sem estoque', () => {
    expect(isProductUnavailable({ active: false, stock: 10 })).toBe(true);
    expect(isProductUnavailable({ active: true, stock: 0 })).toBe(true);
    expect(isProductUnavailable({ active: true, stock: '0' })).toBe(true);
  });

  it('mantém disponível produto com estoque ou estoque ilimitado', () => {
    expect(isProductUnavailable({ active: true, stock: 1 })).toBe(false);
    expect(isProductUnavailable({ active: true, stock: null })).toBe(false);
    expect(isProductUnavailable({ active: true })).toBe(false);
  });

  it('normaliza somente identificadores inteiros positivos', () => {
    expect(toPositiveInteger('12')).toBe(12);
    expect(toPositiveInteger(0)).toBeNull();
    expect(toPositiveInteger('1.5')).toBeNull();
    expect(toPositiveInteger('inválido')).toBeNull();
  });
});
