import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createPublicMediaReference,
  isPublicProductMediaReference,
} from './publicMediaReference.js';

test('cria referência versionada somente para imagem persistida no banco', () => {
  const updatedAt = new Date('2026-08-30T10:00:00.000Z');

  assert.equal(
    createPublicMediaReference(
      'data:image/webp;base64,UklGRg==',
      '/public-media/restaurants/3/products/70',
      updatedAt,
    ),
    `/public-media/restaurants/3/products/70?v=${updatedAt.getTime()}`,
  );
  assert.equal(
    createPublicMediaReference(
      'https://cdn.example.com/product.webp',
      '/public-media/restaurants/3/products/70',
      updatedAt,
    ),
    'https://cdn.example.com/product.webp',
  );
});

test('reconhece somente a referência pública do mesmo produto e restaurante', () => {
  assert.equal(
    isPublicProductMediaReference('/public-media/restaurants/3/products/70?v=1', 3, 70),
    true,
  );
  assert.equal(
    isPublicProductMediaReference(
      'http://localhost:5173/api/public-media/restaurants/3/products/70?v=1',
      3,
      70,
    ),
    true,
  );
  assert.equal(
    isPublicProductMediaReference('/public-media/restaurants/4/products/70?v=1', 3, 70),
    false,
  );
  assert.equal(isPublicProductMediaReference('https://cdn.example.com/product.webp', 3, 70), false);
});
