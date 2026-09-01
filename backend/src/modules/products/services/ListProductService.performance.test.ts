// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import productRepository from '../repositories/ProductRepository.js';
import service from './ListProductService.js';

const originalFindAll = productRepository.findAll;
const originalTransaction = prisma.$transaction;

beforeEach(() => {
  prisma.$transaction = async (callback) => callback({ $queryRaw: async () => [] });
});

afterEach(() => {
  prisma.$transaction = originalTransaction;
  productRepository.findAll = originalFindAll;
});

test('publica imagens persistidas como recursos cacheáveis sem carregar base64 no JSON', async () => {
  const updatedAt = new Date('2026-08-12T12:00:00.000Z');
  productRepository.findAll = async () => [
    {
      id: 70,
      restaurantId: 3,
      name: 'Pizza',
      image: 'data:image/webp;base64,UklGRg==',
      price: 40,
      stock: 2,
      active: true,
      updatedAt,
      discount: null,
    },
    {
      id: 71,
      restaurantId: 3,
      name: 'Massa',
      image: 'https://cdn.example.com/massa.webp',
      price: 32,
      stock: null,
      active: true,
      updatedAt,
      discount: null,
    },
  ];

  const result = await service.execute({ restaurantId: 3 });

  assert.equal(
    result.products[0].image,
    `/public-media/restaurants/3/products/70?v=${updatedAt.getTime()}`,
  );
  assert.equal(result.products[1].image, 'https://cdn.example.com/massa.webp');
});
