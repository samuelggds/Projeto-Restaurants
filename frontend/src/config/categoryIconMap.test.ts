import { Beef, CircleDot, CirclePlus, CookingPot, Milk, Utensils, Wheat } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import {
  resolveCategoryIcon,
  resolveCategoryIconColor,
  resolveCategoryVisual,
} from './categoryIconMap';

describe('ícones das categorias', () => {
  it.each([
    ['Massas', Wheat],
    ['Molhos artesanais', CookingPot],
    ['PROTEÍNAS', Beef],
    ['Queijos', Milk],
    ['Ingredientes adicionais', CirclePlus],
    ['Bordas recheadas', CircleDot],
  ])('seleciona um ícone Lucide para %s', (category, expectedIcon) => {
    expect(resolveCategoryIcon(category)).toBe(expectedIcon);
  });

  it('usa um ícone genérico quando o nome ainda não tem correspondência', () => {
    expect(resolveCategoryIcon('Categoria personalizada')).toBe(Utensils);
  });

  it.each([
    ['Massas', '#a96224'],
    ['Molhos', '#f05a24'],
    ['Proteínas', '#ed4b3e'],
    ['Queijos', '#f5a20b'],
    ['Adicionais', '#20a84b'],
    ['Bordas', '#a85c22'],
  ])('define a cor semântica de %s', (category, expectedColor) => {
    expect(resolveCategoryIconColor(category)).toBe(expectedColor);
  });

  it('resolve ícone e cor juntos a partir do nome criado pelo administrador', () => {
    expect(resolveCategoryVisual('Ingredientes adicionais')).toEqual({
      icon: CirclePlus,
      color: '#20a84b',
    });
  });

  it('mantém uma cor estável para nomes personalizados', () => {
    const first = resolveCategoryVisual('Especiais da casa');
    const repeated = resolveCategoryVisual('  ESPECIAIS DA CASA  ');

    expect(first.icon).toBe(Utensils);
    expect(first.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(repeated).toEqual(first);
  });
});
