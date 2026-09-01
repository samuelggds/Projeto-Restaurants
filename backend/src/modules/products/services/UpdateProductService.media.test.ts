// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import productRepository from '../repositories/ProductRepository.js';
import service from './UpdateProductService.js';

const originals = {
  findById: productRepository.findById,
  transaction: prisma.$transaction,
};

afterEach(() => {
  productRepository.findById = originals.findById;
  prisma.$transaction = originals.transaction;
});

test('preserva os bytes da imagem ao salvar um produto carregado por URL pública', async () => {
  const originalImage = 'data:image/webp;base64,UklGRg==';
  productRepository.findById = async () => ({
    id: 70,
    restaurantId: 3,
    image: originalImage,
  });

  let savedData;
  let savedWhere;
  const transaction = {
    $queryRaw: async () => [{ set_config: '3' }],
    category: {
      findFirst: async () => ({ id: 9 }),
    },
    product: {
      update: async ({ where, data }) => {
        savedWhere = where;
        savedData = data;
        return { id: 70, ...data };
      },
      findUniqueOrThrow: async () => ({ id: 70, ...savedData }),
    },
    productOptionGroup: {
      deleteMany: async () => ({ count: 0 }),
    },
    productCompositionItem: { deleteMany: async () => ({ count: 0 }) },
    productPortionConfiguration: { deleteMany: async () => ({ count: 0 }) },
  };
  prisma.$transaction = async (callback) => callback(transaction);

  await service.execute(
    70,
    {
      name: 'Pizza atualizada',
      price: 49.9,
      categoryId: 9,
      image: 'http://localhost:5173/api/public-media/restaurants/3/products/70?v=123',
    },
    3,
  );

  assert.equal(savedData.image, originalImage);
  assert.deepEqual(savedWhere, { id: 70, restaurantId: 3 });
});

test('aceita uma nova imagem enviada pelo administrador', async () => {
  productRepository.findById = async () => ({
    id: 70,
    restaurantId: 3,
    image: 'data:image/webp;base64,QU5USUdB',
  });

  let savedData;
  let savedWhere;
  const transaction = {
    $queryRaw: async () => [{ set_config: '3' }],
    category: {
      findFirst: async () => ({ id: 9 }),
    },
    product: {
      update: async ({ where, data }) => {
        savedWhere = where;
        savedData = data;
        return { id: 70, ...data };
      },
      findUniqueOrThrow: async () => ({ id: 70, ...savedData }),
    },
    productOptionGroup: {
      deleteMany: async () => ({ count: 0 }),
    },
    productCompositionItem: { deleteMany: async () => ({ count: 0 }) },
    productPortionConfiguration: { deleteMany: async () => ({ count: 0 }) },
  };
  prisma.$transaction = async (callback) => callback(transaction);

  const replacement = 'data:image/webp;base64,Tk9WQQ==';
  await service.execute(
    70,
    { name: 'Pizza atualizada', price: 49.9, categoryId: 9, image: replacement },
    3,
  );

  assert.equal(savedData.image, replacement);
  assert.deepEqual(savedWhere, { id: 70, restaurantId: 3 });
});

test('ADMIN do Restaurante A não atualiza produto real pertencente ao Restaurante B', async () => {
  let transactionCalls = 0;
  productRepository.findById = async (productId, restaurantId, db) => {
    assert.equal(Number(productId), 70);
    assert.equal(restaurantId, 3);
    assert.ok(db);
    return null;
  };
  prisma.$transaction = async (callback) => {
    transactionCalls += 1;
    assert.equal(transactionCalls, 1, 'não deveria abrir uma transação de escrita');
    return callback({ $queryRaw: async () => [{ set_config: '3' }] });
  };

  await assert.rejects(
    () =>
      service.execute(70, { name: 'Produto do outro restaurante', price: 49.9, categoryId: 9 }, 3),
    /Produto não encontrado/i,
  );
  assert.equal(transactionCalls, 1);
});
