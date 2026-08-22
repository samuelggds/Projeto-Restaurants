import { describe, expect, it } from 'vitest';
import type { AdminIngredient } from '../types';
import {
  MIXED_INGREDIENT_CATEGORY,
  groupIngredientsByCategory,
  incompatibleOptionsForCategory,
  inferGroupIngredientCategory,
  listIngredientCategories,
} from './ingredientCategoryGroups';

const ingredients: AdminIngredient[] = [
  { id: 1, name: 'Integral', category: ' Massas ', price: 2, active: true },
  { id: 2, name: 'Fina', category: 'massas', price: 0, active: true },
  { id: 3, name: 'Bacon', category: 'Adicionais', price: 5, active: true },
  { id: 4, name: 'Opção antiga', category: '', price: 0, active: false },
];

describe('categorias dinâmicas de ingredientes no produto', () => {
  it('agrupa sem nomes fixos, normaliza caixa e preserva o array original', () => {
    const originalOrder = ingredients.map((ingredient) => ingredient.id);
    const sections = groupIngredientsByCategory(ingredients);

    expect(sections.map((section) => section.category)).toEqual([
      'Adicionais',
      'Massas',
      'Sem categoria',
    ]);
    expect(sections.find((section) => section.category === 'Massas')?.ingredients).toHaveLength(2);
    expect(ingredients.map((ingredient) => ingredient.id)).toEqual(originalOrder);
  });

  it('infere a categoria quando todas as opções pertencem ao mesmo grupo', () => {
    expect(
      inferGroupIngredientCategory(
        { options: [{ ingredientId: 1 }, { ingredientId: 2 }] },
        ingredients,
      ),
    ).toMatchObject({ value: 'Massas', categories: ['Massas'], missingIngredientIds: [] });
    expect(
      inferGroupIngredientCategory({ options: [{ ingredientId: 2 }] }, ingredients).value,
    ).toBe('Massas');
  });

  it('marca grupos legados mistos ou com ingrediente ausente para revisão', () => {
    expect(
      inferGroupIngredientCategory(
        { options: [{ ingredientId: 1 }, { ingredientId: 3 }, { ingredientId: 999 }] },
        ingredients,
      ),
    ).toEqual({
      value: MIXED_INGREDIENT_CATEGORY,
      categories: ['Adicionais', 'Massas'],
      missingIngredientIds: [999],
    });
  });

  it('identifica apenas vínculos incompatíveis antes de trocar a categoria', () => {
    expect(
      incompatibleOptionsForCategory(
        [{ ingredientId: 1 }, { ingredientId: 2 }, { ingredientId: 3 }],
        ingredients,
        'MASSAS',
      ),
    ).toEqual([{ ingredientId: 3 }]);
    expect(listIngredientCategories(ingredients)).not.toContain('Pizza');
  });
});
