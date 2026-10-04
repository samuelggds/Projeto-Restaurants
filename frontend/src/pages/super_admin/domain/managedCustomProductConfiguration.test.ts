import { describe, expect, it } from 'vitest';
import type { AdminProduct } from '../../admin/types';
import {
  buildManagedCustomProductConfiguration,
  inferManagedCustomizationType,
  isManagedSimpleCustomProduct,
  managedAdditionalPrices,
  managedSelectedIngredientIds,
  managedSelectedProductIds,
} from './managedCustomProductConfiguration';

const baseProduct: AdminProduct = {
  id: '10',
  categoryId: 2,
  category: 'Pizzas',
  name: 'Produto',
  price: 30,
  image: '',
  saleMode: 'BUILDABLE',
  pricingMode: 'BASE',
  configurationVersion: 2,
  optionGroups: [],
  compositionItems: [],
  portionConfiguration: null,
};

describe('managedCustomProductConfiguration', () => {
  it('monta meio a meio com duas escolhas obrigatórias e preço pelo maior produto', () => {
    const configuration = buildManagedCustomProductConfiguration({
      type: 'HALF_HALF',
      selectedProductIds: [101, 102, 101],
      selectedIngredientIds: [],
      additionalPrices: {},
      groupName: '',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      minPortions: 2,
      maxPortions: 2,
    });

    expect(configuration.pricingMode).toBe('HIGHEST_OPTION');
    expect(configuration.portionConfiguration).toBeNull();
    expect(configuration.optionGroups).toHaveLength(2);
    expect(configuration.optionGroups.map((group) => group.name)).toEqual([
      'Primeira metade',
      'Segunda metade',
    ]);

    for (const group of configuration.optionGroups) {
      expect(group).toMatchObject({
        required: true,
        selectionType: 'SINGLE',
        minSelections: 1,
        maxSelections: 1,
      });
      expect(group.options.map((option) => option.referenceProductId)).toEqual([101, 102]);
      expect(group.options.every((option) => option.pricingMode === 'ABSOLUTE')).toBe(true);
    }
  });

  it('monta porções usando a estrutura real de optionGroups e portionConfiguration', () => {
    const configuration = buildManagedCustomProductConfiguration({
      type: 'PORTIONS',
      selectedProductIds: [],
      selectedIngredientIds: [7, 8],
      additionalPrices: { 7: 2.5, 8: 4 },
      groupName: 'Sabores das porções',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      minPortions: 2,
      maxPortions: 4,
    });

    expect(configuration.pricingMode).toBe('BASE');
    expect(configuration.optionGroups).toHaveLength(1);
    expect(configuration.optionGroups[0]).toMatchObject({
      name: 'Sabores das porções',
      required: true,
      selectionType: 'SINGLE',
      minSelections: 1,
      maxSelections: 1,
    });
    expect(configuration.optionGroups[0].options).toEqual([
      expect.objectContaining({ ingredientId: 7, additionalPrice: 2.5, pricingMode: 'ADDITIVE' }),
      expect.objectContaining({ ingredientId: 8, additionalPrice: 4, pricingMode: 'ADDITIVE' }),
    ]);
    expect(configuration.portionConfiguration).toEqual({
      enabled: true,
      optionGroupName: 'Sabores das porções',
      minPortions: 2,
      maxPortions: 4,
      pricingStrategy: 'HIGHEST',
      allowPortionObservations: true,
    });
  });

  it('monta adicionais com mínimo, máximo, obrigatoriedade e acréscimo', () => {
    const configuration = buildManagedCustomProductConfiguration({
      type: 'INGREDIENTS',
      selectedProductIds: [],
      selectedIngredientIds: [11, 12],
      additionalPrices: { 11: 0, 12: 3 },
      groupName: 'Adicionais',
      required: false,
      minSelections: 1,
      maxSelections: 2,
      minPortions: 1,
      maxPortions: 1,
    });

    expect(configuration.pricingMode).toBe('BASE');
    expect(configuration.portionConfiguration).toBeNull();
    expect(configuration.optionGroups[0]).toMatchObject({
      name: 'Adicionais',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
      maxSelections: 2,
    });
    expect(configuration.optionGroups[0].options[1]).toMatchObject({
      ingredientId: 12,
      additionalPrice: 3,
      pricingMode: 'ADDITIVE',
    });
  });

  it('reconhece somente formatos simples que o wizard pode editar sem perda de regras', () => {
    const simpleIngredients: AdminProduct = {
      ...baseProduct,
      optionGroups: [
        {
          name: 'Adicionais',
          required: false,
          selectionType: 'MULTIPLE',
          minSelections: 0,
          maxSelections: 2,
          options: [
            { ingredientId: 7, additionalPrice: 1 },
            { ingredientId: 8, additionalPrice: 2 },
          ],
        },
      ],
    };

    expect(isManagedSimpleCustomProduct(simpleIngredients)).toBe(true);
    expect(inferManagedCustomizationType(simpleIngredients)).toBe('INGREDIENTS');
    expect(managedSelectedIngredientIds(simpleIngredients)).toEqual([7, 8]);
    expect(managedAdditionalPrices(simpleIngredients)).toEqual({ 7: 1, 8: 2 });

    const complex = {
      ...simpleIngredients,
      optionGroups: [
        ...simpleIngredients.optionGroups!,
        {
          name: 'Molhos',
          required: false,
          selectionType: 'MULTIPLE' as const,
          minSelections: 0,
          maxSelections: 1,
          options: [{ ingredientId: 9, additionalPrice: 0 }],
        },
      ],
    };
    expect(isManagedSimpleCustomProduct(complex)).toBe(false);
  });

  it('reconhece o formato simplificado de meio a meio e preserva os produtos selecionados', () => {
    const halfHalfConfig = buildManagedCustomProductConfiguration({
      type: 'HALF_HALF',
      selectedProductIds: [201, 202],
      selectedIngredientIds: [],
      additionalPrices: {},
      groupName: '',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      minPortions: 2,
      maxPortions: 2,
    });
    const halfHalf: AdminProduct = {
      ...baseProduct,
      pricingMode: halfHalfConfig.pricingMode,
      optionGroups: halfHalfConfig.optionGroups,
      portionConfiguration: halfHalfConfig.portionConfiguration,
    };

    expect(isManagedSimpleCustomProduct(halfHalf)).toBe(true);
    expect(inferManagedCustomizationType(halfHalf)).toBe('HALF_HALF');
    expect(managedSelectedProductIds(halfHalf)).toEqual([201, 202]);
  });
});
