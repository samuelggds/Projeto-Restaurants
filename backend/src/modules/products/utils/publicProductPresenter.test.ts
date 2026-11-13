import assert from 'node:assert/strict';
import test from 'node:test';
import { presentPublicProduct } from './publicProductPresenter.js';

test('catálogo mantém personalização, estoque e combos, sem propagar campos privados', () => {
  const value = presentPublicProduct({
    id: 7,
    name: 'Pizza',
    price: 40,
    stock: 3,
    active: true,
    restaurantId: 2,
    configurationVersion: 5,
    createdAt: new Date('2026-01-01'),
    internalCost: 12,
    secretToken: 'SHOULD_NOT_LEAK',
    category: { id: 4, name: 'Pizzas', internalMemo: 'private' },
    discount: { id: 9, kind: 'PERCENTAGE', value: 10, active: true, privateNote: 'secret' },
    optionGroups: [{
      id: 10,
      name: 'Adicionais',
      required: false,
      configurationSecret: 'secret',
      options: [{
        id: 11,
        ingredientId: 12,
        additionalPrice: 3,
        active: true,
        internalCost: 1,
        ingredient: { id: 12, name: 'Queijo', price: 3, internalSupplier: 'private' },
      }],
    }],
    ingredients: [{ id: 13, name: 'Molho', price: 0, active: true, procurementCost: 1 }],
    comboGroups: [{
      id: 14,
      name: 'Monte o combo',
      options: [{
        id: 15,
        componentProductId: 16,
        additionalPrice: 2,
        componentProduct: { id: 16, name: 'Refrigerante', price: 6, internalCost: 2 },
      }],
    }],
  });

  assert.equal(value.stock, 3);
  assert.equal(value.configurationVersion, 5);
  assert.equal(value.optionGroups[0].options[0].ingredient?.name, 'Queijo');
  assert.equal(value.comboGroups[0].options[0].componentProduct?.name, 'Refrigerante');
  const serialized = JSON.stringify(value);
  for (const secret of [
    'internalCost', 'createdAt', 'secretToken', 'internalMemo', 'privateNote',
    'configurationSecret', 'internalSupplier', 'procurementCost',
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
});

test('produto indisponível mantém estado necessário para o cardápio', () => {
  const value = presentPublicProduct({
    id: 2, name: 'Pizza esgotada', price: 29, active: false, stock: 0,
    ingredients: [], optionGroups: [], compositionItems: [], comboGroups: [],
  });
  assert.equal(value.active, false);
  assert.equal(value.stock, 0);
});
