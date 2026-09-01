import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOrderItemCustomizationSnapshot,
  resolveOrderItemCustomizations,
} from './productIngredients.js';

function ingredient(id: number, name: string, price = 99, restaurantId = 7) {
  return { id, name, price, restaurantId, active: true };
}

function option(
  id: number,
  name: string,
  additionalPrice: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    restaurantId: 7,
    ingredientId: id,
    ingredient: ingredient(id, name),
    active: true,
    additionalPrice,
    pricingMode: 'ADDITIVE' as const,
    allowQuantity: false,
    minQuantity: 1,
    maxQuantity: 1,
    defaultQuantity: 1,
    defaultSelected: false,
    locked: false,
    ...overrides,
  };
}

function group(
  id: number,
  name: string,
  options: ReturnType<typeof option>[],
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    restaurantId: 7,
    name,
    required: false,
    selectionType: 'MULTIPLE' as const,
    minSelections: 0,
    maxSelections: options.length,
    active: true,
    options,
    ...overrides,
  };
}

function product(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    restaurantId: 7,
    name: 'Produto configurável',
    saleMode: 'BUILDABLE' as const,
    configurationVersion: 3,
    price: 20,
    ingredients: [],
    optionGroups: [group(100, 'Adicionais', [option(1, 'Bacon', 4)])],
    compositionItems: [],
    portionConfiguration: null,
    discount: null,
    ...overrides,
  };
}

test('COMPLETE mantém preço-base e rejeita montagem artificial', () => {
  const simple = product({ saleMode: 'COMPLETE', optionGroups: [], price: 6 });
  assert.equal(resolveOrderItemCustomizations(simple).price, 6);
  assert.throws(
    () => resolveOrderItemCustomizations(simple, { optionIds: [1] }),
    /vendido sem etapas/i,
  );
});

test('usa additionalPrice do vínculo sem confiar no preço global do ingrediente', () => {
  const first = product({
    optionGroups: [group(100, 'Adicionais', [option(1, 'Bacon', 4)])],
  });
  const second = product({
    id: 11,
    optionGroups: [group(101, 'Adicionais', [option(2, 'Bacon', 6)])],
  });
  assert.equal(resolveOrderItemCustomizations(first, { optionIds: [1] }).price, 24);
  assert.equal(resolveOrderItemCustomizations(second, { optionIds: [2] }).price, 26);
});

test('multiplica quantidade e respeita limites configurados', () => {
  const withQuantity = product({
    optionGroups: [
      group(100, 'Adicionais', [
        option(1, 'Bacon', 4, {
          allowQuantity: true,
          minQuantity: 1,
          maxQuantity: 3,
          defaultQuantity: 1,
        }),
      ]),
    ],
  });
  const snapshot = buildOrderItemCustomizationSnapshot(withQuantity, {
    quantity: 1,
    optionIds: [1],
    optionQuantities: [{ optionId: 1, quantity: 2 }],
  });
  assert.equal(snapshot.price, 28);
  assert.equal(snapshot.customizations[0].options[0].quantity, 2);
  assert.equal(snapshot.customizations[0].options[0].totalPrice, 8);
  assert.throws(
    () =>
      resolveOrderItemCustomizations(withQuantity, {
        optionIds: [1],
        optionQuantities: [{ optionId: 1, quantity: 4 }],
      }),
    /entre 1 e 3/i,
  );
});

test('opção ABSOLUTE define o preço-base e mantém adicionais separados', () => {
  const sized = product({
    price: 0,
    optionGroups: [
      group(
        100,
        'Tamanho',
        [
          option(1, 'Médio', 0, {
            pricingMode: 'ABSOLUTE',
            absolutePrice: 40,
          }),
        ],
        { required: true, selectionType: 'SINGLE', minSelections: 1, maxSelections: 1 },
      ),
      group(200, 'Adicionais', [option(2, 'Bacon', 4)]),
    ],
  });
  assert.equal(resolveOrderItemCustomizations(sized, { optionIds: [1, 2] }).price, 44);
});

test('registra somente remoções permitidas e congela nomes no snapshot', () => {
  const compositionProduct = product({
    optionGroups: [],
    compositionItems: [
      {
        id: 50,
        restaurantId: 7,
        ingredientId: 50,
        removable: true,
        active: true,
        ingredient: ingredient(50, 'Cebola'),
      },
      {
        id: 51,
        restaurantId: 7,
        ingredientId: 51,
        removable: false,
        active: true,
        ingredient: ingredient(51, 'Pão'),
      },
    ],
  });
  const snapshot = buildOrderItemCustomizationSnapshot(compositionProduct, {
    quantity: 1,
    removedCompositionItemIds: [50],
  });
  assert.deepEqual(snapshot.configurationSnapshot.removedComposition, [
    {
      compositionItemId: 50,
      ingredientId: 50,
      name: 'Cebola',
      removable: true,
      removed: true,
    },
  ]);
  assert.throws(
    () =>
      resolveOrderItemCustomizations(compositionProduct, {
        removedCompositionItemIds: [51],
      }),
    /não pode ser removido/i,
  );
});

test('rejeita versão desatualizada e configuração cross-tenant', () => {
  assert.throws(
    () => resolveOrderItemCustomizations(product(), { configurationVersion: 2 }),
    /foi atualizada/i,
  );
  const foreign = product({
    optionGroups: [
      group(100, 'Adicionais', [
        {
          ...option(1, 'Bacon', 4),
          restaurantId: 8,
          ingredient: ingredient(1, 'Bacon', 4, 8),
        },
      ]),
    ],
  });
  assert.throws(() => resolveOrderItemCustomizations(foreign, { optionIds: [1] }), /indisponível/i);
});

function portionProduct(
  strategy: 'ADD' | 'HIGHEST' | 'AVERAGE' | 'PROPORTIONAL' | 'FIXED',
  prices = [42, 48],
) {
  const portionOptions = prices.map((price, index) =>
    option(index + 1, `Opção ${index + 1}`, 0, {
      pricingMode: 'ABSOLUTE',
      absolutePrice: price,
    }),
  );
  return product({
    price: 30,
    optionGroups: [group(300, 'Partes', portionOptions)],
    portionConfiguration: {
      enabled: true,
      optionGroupId: 300,
      minPortions: 1,
      maxPortions: prices.length,
      pricingStrategy: strategy,
      allowPortionObservations: true,
    },
  });
}

test('calcula HIGHEST, AVERAGE, PROPORTIONAL e FIXED para porções', () => {
  const portions = [{ optionId: 1, observation: 'Sem cebola' }, { optionId: 2 }];
  assert.equal(resolveOrderItemCustomizations(portionProduct('HIGHEST'), { portions }).price, 48);
  assert.equal(resolveOrderItemCustomizations(portionProduct('AVERAGE'), { portions }).price, 45);
  assert.equal(
    resolveOrderItemCustomizations(portionProduct('PROPORTIONAL'), { portions }).price,
    45,
  );
  const fixed = buildOrderItemCustomizationSnapshot(portionProduct('FIXED'), {
    quantity: 1,
    portions,
  });
  assert.equal(fixed.price, 30);
  assert.equal(fixed.configurationSnapshot.portions[0].fraction, '1/2');
  assert.equal(fixed.configurationSnapshot.portions[0].observation, 'Sem cebola');
});

test('ADD soma deltas e três frações arredondam deterministicamente', () => {
  const additive = portionProduct('ADD', [1, 2]);
  additive.optionGroups[0].options = additive.optionGroups[0].options.map((item, index) => ({
    ...item,
    pricingMode: 'ADDITIVE',
    absolutePrice: null,
    additionalPrice: index + 1,
  }));
  assert.equal(
    resolveOrderItemCustomizations(additive, {
      portions: [{ optionId: 1 }, { optionId: 2 }],
    }).price,
    33,
  );

  assert.equal(
    resolveOrderItemCustomizations(portionProduct('PROPORTIONAL', [10, 11, 11]), {
      portions: [{ optionId: 1 }, { optionId: 2 }, { optionId: 3 }],
    }).price,
    10.67,
  );
});

test('porções respeitam mínimo, máximo e opções do grupo configurado', () => {
  const configured = portionProduct('HIGHEST');
  assert.throws(() => resolveOrderItemCustomizations(configured, { portions: [] }), /entre 1 e 2/i);
  assert.throws(
    () =>
      resolveOrderItemCustomizations(configured, {
        portions: [{ optionId: 1 }, { optionId: 2 }, { optionId: 1 }],
      }),
    /entre 1 e 2/i,
  );
  assert.throws(
    () => resolveOrderItemCustomizations(configured, { portions: [{ optionId: 999 }] }),
    /indisponível/i,
  );
});
