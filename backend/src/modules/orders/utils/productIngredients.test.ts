import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrderItemCustomizations, resolveOrderItemIngredients } from './productIngredients.js';

const legacyProduct = { name: 'Pizza montável', saleMode: 'BUILDABLE' as const, price: 20, ingredients: [
  { id: 1, name: 'Massa', price: 0, required: true, active: true },
  { id: 2, name: 'Bacon', price: 4.5, required: false, active: true },
] };

const product = {
  id: 10, restaurantId: 7, name: 'Pizza da casa', saleMode: 'BUILDABLE' as const, price: 30, ingredients: [],
  optionGroups: [
    { id: 100, restaurantId: 7, name: 'Massa', required: true, selectionType: 'SINGLE' as const, minSelections: 1, maxSelections: 1, active: true, options: [
      { id: 1001, ingredientId: 11, active: true, ingredient: { id: 11, restaurantId: 7, name: 'Massa fina', price: 0, active: true } },
      { id: 1002, ingredientId: 12, active: true, ingredient: { id: 12, restaurantId: 7, name: 'Massa grossa', price: 3, active: true } },
    ] },
    { id: 200, restaurantId: 7, name: 'Adicionais', required: false, selectionType: 'MULTIPLE' as const, minSelections: 0, maxSelections: 2, active: true, options: [
      { id: 2001, ingredientId: 21, active: true, ingredient: { id: 21, restaurantId: 7, name: 'Bacon', price: 4.5, active: true } },
      { id: 2002, ingredientId: 22, active: true, ingredient: { id: 22, restaurantId: 7, name: 'Queijo', price: 2, active: true } },
      { id: 2003, ingredientId: 23, active: true, ingredient: { id: 23, restaurantId: 7, name: 'Cebola', price: 1, active: true } },
    ] },
  ],
};

test('mantém compatibilidade legada e calcula o preço no servidor', () => {
  assert.deepEqual(resolveOrderItemIngredients(legacyProduct, [1, 2]), { price: 24.5, ingredients: [{ id: 1, name: 'Massa', price: 0 }, { id: 2, name: 'Bacon', price: 4.5 }], customizations: [] });
});

test('resolve grupos, adicionais e snapshot completo', () => {
  const result = resolveOrderItemCustomizations(product, { optionIds: [1002, 2001] });
  assert.equal(result.price, 37.5);
  assert.deepEqual(result.ingredients, [{ id: 12, name: 'Massa grossa', price: 3 }, { id: 21, name: 'Bacon', price: 4.5 }]);
  assert.deepEqual(result.customizations[0].options[0], { optionId: 1002, ingredientId: 12, name: 'Massa grossa', price: 3 });
});

test('aceita seleção estruturada e valida associação grupo-opção', () => {
  assert.equal(resolveOrderItemCustomizations(product, { selectedOptions: [{ groupId: 100, optionIds: [1001] }, { groupId: 200, optionIds: [2002] }] }).price, 32);
  assert.throws(() => resolveOrderItemCustomizations(product, { selectedOptions: [{ groupId: 100, optionIds: [2001] }] }), /não pertence ao grupo Massa/);
});

test('valida obrigatório, escolha única e máximo do grupo', () => {
  assert.throws(() => resolveOrderItemCustomizations(product, { optionIds: [2001] }), /Massa/);
  assert.throws(() => resolveOrderItemCustomizations(product, { optionIds: [1001, 1002] }), /no máximo 1 opção em Massa/);
  assert.throws(() => resolveOrderItemCustomizations(product, { optionIds: [1001, 2001, 2002, 2003] }), /no máximo 2 opções em Adicionais/);
});

test('rejeita opção indisponível, repetida ou de outro restaurante', () => {
  const inactive = structuredClone(product); inactive.optionGroups[1].options[0].active = false;
  assert.throws(() => resolveOrderItemCustomizations(inactive, { optionIds: [1001, 2001] }), /indisponível/);
  assert.throws(() => resolveOrderItemCustomizations(product, { optionIds: [1001, 1001] }), /repetidas/);
  const wrongTenant = structuredClone(product); wrongTenant.optionGroups[0].restaurantId = 99;
  assert.throws(() => resolveOrderItemCustomizations(wrongTenant, { optionIds: [1001] }), /outro restaurante/);
});
