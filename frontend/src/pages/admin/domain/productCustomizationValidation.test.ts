import { describe, expect, it } from 'vitest';
import type { AdminIngredient, AdminProductOptionGroup } from '../types';
import {
  normalizeOptionGroup,
  validateIngredientDraft,
  validateOptionGroups,
} from './productCustomizationValidation';

const ingredients: AdminIngredient[] = [
  { id: 1, name: 'Massa fina', price: 0, category: 'Massas', active: true },
  { id: 2, name: 'Massa grossa', price: 3, category: 'Massas', active: true },
  { id: 3, name: 'Ingrediente antigo', price: 1, category: 'Adicionais', active: false },
];

function group(overrides: Partial<AdminProductOptionGroup> = {}): AdminProductOptionGroup {
  return {
    name: 'Escolha a massa',
    required: true,
    selectionType: 'SINGLE',
    minSelections: 1,
    maxSelections: 1,
    options: [{ ingredientId: 1 }, { ingredientId: 2 }],
    ...overrides,
  };
}

describe('validação do catálogo de ingredientes', () => {
  it('aceita preço zero e rejeita nome duplicado ou preço inválido', () => {
    expect(
      validateIngredientDraft({ name: 'Molho', price: 0, category: 'Molhos' }, ingredients),
    ).toEqual([]);
    expect(
      validateIngredientDraft(
        { name: ' massa FINA ', price: -1, category: 'Massas' },
        ingredients,
      ),
    ).toEqual([
      'Informe um valor adicional igual ou maior que zero.',
      'Já existe um ingrediente com esse nome.',
    ]);
  });

  it('permite editar o próprio ingrediente sem acusar duplicidade', () => {
    expect(
      validateIngredientDraft(
        { id: 1, name: 'Massa fina', price: 2, category: 'Massas' },
        ingredients,
      ),
    ).toEqual([]);
  });

  it('exige uma categoria válida', () => {
    expect(validateIngredientDraft({ name: 'Cheddar', price: 4, category: ' ' }, ingredients)).toEqual([
      'Informe a categoria do ingrediente.',
    ]);
  });
});

describe('validação dos grupos de montagem', () => {
  it('aceita grupo obrigatório de escolha única', () => {
    expect(validateOptionGroups([group()], ingredients)).toEqual([]);
  });

  it('rejeita opção inativa e grupo sem opções', () => {
    const errors = validateOptionGroups(
      [
        group({
          name: 'Adicionais',
          selectionType: 'MULTIPLE',
          minSelections: 2,
          maxSelections: 4,
          options: [{ ingredientId: 3 }],
        }),
      ],
      ingredients,
    );
    expect(errors).toContain('Adicionais: remova opções inativas ou indisponíveis.');
    expect(validateOptionGroups([group({ name: 'Molhos', options: [] })], ingredients)).toContain(
      'Molhos: selecione ao menos uma opção.',
    );
  });

  it('normaliza opções repetidas e os limites de escolha única', () => {
    expect(
      normalizeOptionGroup(
        group({
          minSelections: 0,
          maxSelections: 8,
          options: [{ ingredientId: 1 }, { ingredientId: 1 }, { ingredientId: 2 }],
        }),
      ),
    ).toMatchObject({
      minSelections: 1,
      maxSelections: 1,
      options: [{ ingredientId: 1 }, { ingredientId: 2 }],
    });
  });

  it('mantém mínimo obrigatório e zera o mínimo de categoria opcional', () => {
    expect(normalizeOptionGroup(group({ required: true, minSelections: 0 })).minSelections).toBe(1);
    expect(normalizeOptionGroup(group({ required: false, minSelections: 2 })).minSelections).toBe(0);
  });
});
