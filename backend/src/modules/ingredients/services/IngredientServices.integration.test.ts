// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import ingredientRepository from '../repositories/IngredientRepository.js';
import {
  CreateIngredientService,
  DeleteIngredientService,
  ListIngredientsService,
  UpdateIngredientService,
} from './IngredientServices.js';

const originals = {
  findAll: ingredientRepository.findAll,
  findByName: ingredientRepository.findByName,
  findById: ingredientRepository.findById,
  create: ingredientRepository.create,
  update: ingredientRepository.update,
  delete: ingredientRepository.delete,
};
afterEach(() => Object.assign(ingredientRepository, originals));

test('lista categorias dinâmicas apenas do restaurante autenticado', async () => {
  ingredientRepository.findAll = async (restaurantId) => {
    assert.equal(restaurantId, 8);
    return [
      { id: 1, restaurantId, name: 'Bacon', category: 'Adicionais', price: 4, active: true },
      { id: 2, restaurantId, name: 'Massa fina', category: 'Massas', price: 0, active: true },
      { id: 3, restaurantId, name: 'Queijo', category: 'Adicionais', price: 3, active: true },
    ];
  };

  const result = await new ListIngredientsService().execute(8);

  assert.equal(result.count, 3);
  assert.deepEqual(result.categories, ['Adicionais', 'Massas']);
});

test('cria ingrediente exclusivamente no restaurante autenticado', async () => {
  ingredientRepository.findByName = async (_name, restaurantId) => {
    assert.equal(restaurantId, 8);
    return null;
  };
  ingredientRepository.create = async (data, restaurantId) => ({ id: 41, restaurantId, ...data });
  const result = await new CreateIngredientService().execute(
    { name: '  Bacon  ', category: '  Adicionais  ', price: 4.5, active: true },
    8,
  );
  assert.equal(result.restaurantId, 8);
  assert.equal(result.name, 'Bacon');
  assert.equal(result.category, 'Adicionais');
});

test('persiste imagem válida e mantém ingrediente sem imagem válido', async () => {
  const webp = Buffer.from('524946460400000057454250', 'hex');
  const image = `data:image/webp;base64,${webp.toString('base64')}`;
  const writes = [];
  ingredientRepository.findByName = async () => null;
  ingredientRepository.create = async (data, restaurantId) => {
    writes.push({ data, restaurantId });
    return { id: writes.length, restaurantId, ...data, updatedAt: new Date(0) };
  };

  const withImage = await new CreateIngredientService().execute(
    { name: 'Bacon', category: 'Adicionais', price: 5, image },
    8,
  );
  const withoutImage = await new CreateIngredientService().execute(
    { name: 'Sal', category: 'Temperos', price: 0 },
    8,
  );

  assert.match(withImage.image, /public-media\/restaurants\/8\/ingredients\/1/);
  assert.equal(withoutImage.image, null);
  assert.equal(writes[0].data.image, image);
  assert.equal(writes[1].data.image, null);
});

test('não atualiza ingrediente pertencente a outro restaurante', async () => {
  let called = false;
  ingredientRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 8);
    return null;
  };
  ingredientRepository.update = async () => {
    called = true;
  };
  await assert.rejects(
    () => new UpdateIngredientService().execute(41, { price: 9 }, 8),
    /não encontrado neste restaurante/,
  );
  assert.equal(called, false);
});

test('exige categoria em ingredientes novos', async () => {
  let createCalled = false;
  ingredientRepository.create = async () => {
    createCalled = true;
  };
  await assert.rejects(
    () => new CreateIngredientService().execute({ name: 'Bacon', price: 4.5 }, 8),
    /Categoria do ingrediente é obrigatória/,
  );
  assert.equal(createCalled, false);
});

test('atualiza a categoria apenas dentro do restaurante autenticado', async () => {
  ingredientRepository.findById = async (_id, restaurantId) => ({
    id: 41,
    restaurantId,
    name: 'Bacon',
    category: 'Geral',
  });
  ingredientRepository.update = async (_id, data, restaurantId) => ({
    id: 41,
    restaurantId,
    name: 'Bacon',
    ...data,
  });
  const result = await new UpdateIngredientService().execute(41, { category: '  Adicionais  ' }, 8);
  assert.equal(result.restaurantId, 8);
  assert.equal(result.category, 'Adicionais');
});

test('remove somente a imagem do ingrediente do restaurante autenticado', async () => {
  ingredientRepository.findById = async (_id, restaurantId) => ({
    id: 41,
    restaurantId,
    name: 'Bacon',
    image: 'imagem-anterior',
  });
  ingredientRepository.update = async (_id, data, restaurantId) => ({
    id: 41,
    restaurantId,
    name: 'Bacon',
    ...data,
    updatedAt: new Date(0),
  });

  const result = await new UpdateIngredientService().execute(41, { image: null }, 8);

  assert.equal(result.restaurantId, 8);
  assert.equal(result.image, null);
});

test('não exclui ingrediente pertencente a outro restaurante', async () => {
  let called = false;
  ingredientRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 8);
    return null;
  };
  ingredientRepository.delete = async () => {
    called = true;
  };
  await assert.rejects(
    () => new DeleteIngredientService().execute(41, 8),
    /não encontrado neste restaurante/,
  );
  assert.equal(called, false);
});
