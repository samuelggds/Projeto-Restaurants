import { describe, expect, it } from 'vitest';
import {
  buildProductConfiguration,
  createInitialSelections,
  normalizeProductOptionGroups,
  productConfigurationSignature,
  productConfigurationTotal,
  toggleProductOption,
  validateProductSelections,
  type ProductOptionGroup,
  type SelectionState,
} from './productCustomization';

const groups: ProductOptionGroup[] = [
  {
    id: 'massa',
    name: 'Massa',
    required: true,
    selectionType: 'SINGLE',
    minSelections: 1,
    maxSelections: 1,
    options: [
      { id: 'fina', name: 'Fina', price: 0, active: true },
      { id: 'grossa', name: 'Grossa', price: 4, active: true },
    ],
  },
  {
    id: 'extras',
    name: 'Adicionais',
    required: false,
    selectionType: 'MULTIPLE',
    minSelections: 0,
    maxSelections: 2,
    options: [
      { id: 'bacon', name: 'Bacon', price: 5, active: true },
      { id: 'queijo', name: 'Queijo', price: 3, active: true },
      { id: 'cebola', name: 'Cebola', price: 2, active: true },
    ],
  },
];

describe('montagem genérica de produto', () => {
  it('exige o mínimo configurado e respeita escolha única', () => {
    let selections = createInitialSelections(groups);
    expect(validateProductSelections(groups, selections)).toEqual({
      massa: 'Escolha 1 opção em Massa.',
    });

    selections = toggleProductOption(groups, selections, 'massa', 'fina');
    selections = toggleProductOption(groups, selections, 'massa', 'grossa');
    expect(selections.massa).toEqual(['grossa']);
    expect(validateProductSelections(groups, selections)).toEqual({});
  });

  it('não ultrapassa o máximo e soma somente opções selecionadas', () => {
    let selections: SelectionState = { massa: ['fina'], extras: [] };
    selections = toggleProductOption(groups, selections, 'extras', 'bacon');
    selections = toggleProductOption(groups, selections, 'extras', 'queijo');
    selections = toggleProductOption(groups, selections, 'extras', 'cebola');
    expect(selections.extras).toEqual(['bacon', 'queijo']);
    expect(productConfigurationTotal(30, groups, selections)).toBe(38);
  });

  it('normaliza ingredientes antigos sem permitir remover os obrigatórios', () => {
    const normalized = normalizeProductOptionGroups({
      ingredients: [
        { id: '1', name: 'Massa', price: 0, required: true },
        { id: '2', name: 'Bacon', price: 4 },
      ],
    });
    const initial = createInitialSelections(normalized);
    expect(initial['legacy-ingredients']).toEqual(['1']);
    expect(toggleProductOption(normalized, initial, 'legacy-ingredients', '1')).toEqual(initial);
  });

  it('trata limite vazio como todas as opções disponíveis em escolha múltipla', () => {
    const normalized = normalizeProductOptionGroups({
      optionGroups: [
        {
          id: 'extras',
          name: 'Ingredientes adicionais',
          required: false,
          selectionType: 'MULTIPLE',
          minSelections: 0,
          maxSelections: null,
          options: [
            { id: 'bacon', name: 'Bacon', price: 5, active: true },
            { id: 'queijo', name: 'Queijo', price: 3, active: true },
          ],
        },
      ],
    });

    expect(normalized[0].maxSelections).toBe(2);
    let selections = createInitialSelections(normalized);
    selections = toggleProductOption(normalized, selections, 'extras', 'bacon');
    selections = toggleProductOption(normalized, selections, 'extras', 'queijo');
    expect(selections.extras).toEqual(['bacon', 'queijo']);
  });

  it('gera assinatura diferente para opções ou observações diferentes', () => {
    const first = buildProductConfiguration(groups, { massa: ['fina'], extras: [] }, 'sem sal');
    const second = buildProductConfiguration(groups, { massa: ['grossa'], extras: [] }, '');
    expect(productConfigurationSignature(first)).not.toBe(productConfigurationSignature(second));
    expect(first.selectedOptionIds).toEqual(['fina']);
  });
});
