import test from 'node:test';
import assert from 'node:assert/strict';
import { productOptionGroupSchema } from './ProductValidator.js';

const category = {
  name: 'Massas',
  description: 'Escolha uma massa.',
  required: true,
  selectionType: 'SINGLE' as const,
  minSelections: 1,
  maxSelections: 1,
  options: [{ ingredientId: 1, active: true }],
};

test('aceita categoria obrigatória com mínimo de uma escolha', () => {
  assert.equal(productOptionGroupSchema.safeParse(category).success, true);
});

test('aceita categoria opcional somente com mínimo zero', () => {
  assert.equal(
    productOptionGroupSchema.safeParse({
      ...category,
      name: 'Ingredientes adicionais',
      required: false,
      selectionType: 'MULTIPLE',
      minSelections: 0,
    }).success,
    true,
  );

  const invalid = productOptionGroupSchema.safeParse({
    ...category,
    name: 'Ingredientes adicionais',
    required: false,
    selectionType: 'MULTIPLE',
    minSelections: 1,
  });

  if (invalid.success) {
    assert.fail('A categoria opcional com mínimo 1 deveria ser rejeitada.');
  }
  assert.match(
    invalid.error.issues[0]?.message || '',
    /categoria opcional deve permitir continuar sem nenhuma escolha/i,
  );
});
