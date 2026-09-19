// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import productRepository from '../repositories/ProductRepository.js';
import createProductService from './CreateProductService.js';
import updateProductService from './UpdateProductService.js';

const originals = {
  findById: productRepository.findById,
  transaction: prisma.$transaction,
};

afterEach(() => {
  productRepository.findById = originals.findById;
  prisma.$transaction = originals.transaction;
});

function transactionDouble() {
  let createdData;
  let updatedData;
  let deletedGroups = 0;
  const tx = {
    $queryRaw: async () => [{ set_config: '3' }],
    category: { findFirst: async () => ({ id: 9 }) },
    ingredient: { findMany: async () => [{ id: 20 }] },
    productOptionGroup: {
      deleteMany: async () => {
        deletedGroups += 1;
        return { count: 1 };
      },
    },
    productCompositionItem: { deleteMany: async () => ({ count: 0 }) },
    productPortionConfiguration: {
      deleteMany: async () => ({ count: 0 }),
      create: async ({ data }) => data,
    },
    product: {
      findMany: async () => [{ id: 201, price: 35, pricingMode: 'BASE' }],
      create: async ({ data }) => {
        createdData = data;
        return { id: 70, ...data };
      },
      update: async ({ data }) => {
        updatedData = data;
        return { id: 70, ...data };
      },
      findUniqueOrThrow: async () => ({
        id: 70,
        ...createdData,
        ...updatedData,
        optionGroups: createdData?.optionGroups?.create || updatedData?.optionGroups?.create || [],
      }),
    },
  };
  prisma.$transaction = async (callback) => callback(tx);
  return {
    get createdData() {
      return createdData;
    },
    get updatedData() {
      return updatedData;
    },
    get deletedGroups() {
      return deletedGroups;
    },
  };
}

test('cria produto COMPLETE sem grupos de opções', async () => {
  const saved = transactionDouble();

  await createProductService.execute(
    { name: 'Refrigerante', price: 6, categoryId: 9, saleMode: 'COMPLETE' },
    3,
  );

  assert.equal(saved.createdData.saleMode, 'COMPLETE');
  assert.equal(saved.createdData.optionGroups, undefined);
});

const halfHalfGroups = [
  {
    name: 'Sabores',
    required: true,
    selectionType: 'SINGLE',
    minSelections: 1,
    maxSelections: 1,
    options: [{ referenceProductId: 201 }],
  },
];

test('cria meio a meio sem preço fixo e normaliza qualquer base enviada para zero', async () => {
  for (const price of [undefined, 29.9]) {
    const saved = transactionDouble();
    await createProductService.execute(
      {
        name: 'Meio a meio',
        price,
        categoryId: 9,
        saleMode: 'BUILDABLE',
        pricingMode: 'HIGHEST_OPTION',
        optionGroups: halfHalfGroups,
      },
      3,
    );
    assert.equal(saved.createdData.price, 0);
    assert.equal(saved.createdData.pricingMode, 'HIGHEST_OPTION');
  }
});

test('produto de preço fixo continua exigindo valor no cadastro', async () => {
  transactionDouble();
  await assert.rejects(
    () => createProductService.execute({ name: 'Pizza', categoryId: 9 }, 3),
    /Preço deve ser um número/,
  );
});

test('não converte um combo em produto de preço dinâmico pela rota de produtos', async () => {
  transactionDouble();
  productRepository.findById = async () => ({
    id: 70,
    restaurantId: 3,
    kind: 'COMBO',
    saleMode: 'BUILDABLE',
    optionGroups: halfHalfGroups,
  });
  await assert.rejects(
    () => updateProductService.execute(70, { pricingMode: 'HIGHEST_OPTION' }, 3),
    /não de combos/,
  );
});

test('meio a meio não aceita cadastro sem escolha obrigatória de produtos', async () => {
  for (const patch of [
    { saleMode: 'COMPLETE' },
    {
      optionGroups: halfHalfGroups.map((group) => ({
        ...group,
        required: false,
        minSelections: 0,
      })),
    },
    { optionGroups: [{ ...halfHalfGroups[0], options: [{ ingredientId: 20 }] }] },
  ]) {
    transactionDouble();
    await assert.rejects(
      () =>
        createProductService.execute(
          {
            name: 'Pizza',
            categoryId: 9,
            saleMode: 'BUILDABLE',
            pricingMode: 'HIGHEST_OPTION',
            optionGroups: halfHalfGroups,
            ...patch,
          },
          3,
        ),
      /meio a meio/i,
    );
  }
});

test('atualização parcial preserva modo dinâmico e impede apagar sua regra de preço', async () => {
  const saved = transactionDouble();
  productRepository.findById = async () => ({
    id: 70,
    restaurantId: 3,
    price: 0,
    saleMode: 'BUILDABLE',
    pricingMode: 'HIGHEST_OPTION',
    optionGroups: halfHalfGroups,
    portionConfiguration: null,
  });
  await updateProductService.execute(70, { name: 'Novo nome', price: 999 }, 3);
  assert.equal(saved.updatedData.price, 0);
  assert.equal(saved.updatedData.pricingMode, 'HIGHEST_OPTION');
  await assert.rejects(
    () =>
      updateProductService.execute(
        70,
        {
          optionGroups: halfHalfGroups.map((group) => ({
            ...group,
            required: false,
            minSelections: 0,
          })),
        },
        3,
      ),
    /etapa obrigatória/,
  );
  await assert.rejects(
    () => updateProductService.execute(70, { pricingMode: 'BASE' }, 3),
    /Informe o preço/,
  );
  await updateProductService.execute(70, { pricingMode: 'BASE', price: 35 }, 3);
  assert.equal(saved.updatedData.price, 35);
  assert.equal(saved.updatedData.pricingMode, 'BASE');
});

test('mantém compatibilidade inferindo BUILDABLE quando cliente legado envia grupos', async () => {
  const saved = transactionDouble();

  await createProductService.execute(
    {
      name: 'Produto montável',
      price: 20,
      categoryId: 9,
      optionGroups: [
        {
          name: 'Escolha',
          required: true,
          selectionType: 'SINGLE',
          minSelections: 1,
          maxSelections: 1,
          options: [{ ingredientId: 20 }],
        },
      ],
    },
    3,
  );

  assert.equal(saved.createdData.saleMode, 'BUILDABLE');
  assert.equal(saved.createdData.optionGroups.create.length, 1);
  assert.equal(saved.createdData.optionGroups.create[0].restaurantId, undefined);
  assert.equal(saved.createdData.optionGroups.create[0].options.create[0].restaurantId, undefined);
});

test('exige confirmação antes de apagar configuração BUILDABLE', async () => {
  transactionDouble();
  productRepository.findById = async () => ({
    id: 70,
    restaurantId: 3,
    saleMode: 'BUILDABLE',
    optionGroups: [{ id: 1 }],
    image: null,
  });

  await assert.rejects(
    () => updateProductService.execute(70, { saleMode: 'COMPLETE' }, 3),
    /Confirme a remoção das etapas de personalização/i,
  );
});

test('converte BUILDABLE para COMPLETE e remove os grupos após confirmação', async () => {
  const saved = transactionDouble();
  productRepository.findById = async () => ({
    id: 70,
    restaurantId: 3,
    saleMode: 'BUILDABLE',
    optionGroups: [{ id: 1 }],
    image: null,
  });

  await updateProductService.execute(
    70,
    { saleMode: 'COMPLETE', confirmDiscardConfiguration: true },
    3,
  );

  assert.equal(saved.updatedData.saleMode, 'COMPLETE');
  assert.equal(saved.deletedGroups, 1);
});
