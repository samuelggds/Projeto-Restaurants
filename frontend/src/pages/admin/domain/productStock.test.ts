import { describe, expect, it } from 'vitest';
import { isProductActiveFromStock, isUnlimitedStock, normalizeProductStock } from './productStock';

describe('regras de estoque do produto', () => {
  it('considera estoque nulo ou indefinido como ilimitado', () => {
    expect(isUnlimitedStock(null)).toBe(true);
    expect(isUnlimitedStock(undefined)).toBe(true);
    expect(isUnlimitedStock(0)).toBe(false);
  });

  it('desativa automaticamente quando o estoque chega a zero', () => {
    expect(isProductActiveFromStock(0)).toBe(false);
  });

  it('reativa quando o estoque volta a ser positivo ou ilimitado', () => {
    expect(isProductActiveFromStock(1)).toBe(true);
    expect(isProductActiveFromStock(null)).toBe(true);
  });

  it('normaliza apenas quantidades inteiras não negativas', () => {
    expect(normalizeProductStock('12', false)).toBe(12);
    expect(normalizeProductStock('', true)).toBeNull();
    expect(() => normalizeProductStock('-1', false)).toThrow();
    expect(() => normalizeProductStock('1.5', false)).toThrow();
    expect(() => normalizeProductStock('', false)).toThrow();
  });
});
