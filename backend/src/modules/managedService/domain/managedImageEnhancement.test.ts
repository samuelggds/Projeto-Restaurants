import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { decodeManagedImage, getManagedImageProfile, managedImageInputSchema, managedImageRestaurantId } from './managedImageEnhancement.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8mQAAAAASUVORK5CYII=';

test('imagens assistidas aceitam somente payload e finalidades limitados no servidor', () => {
  const input = { imageDataUrl: image, purpose: 'PRODUCT', operationId: randomUUID() };
  assert.equal(managedImageInputSchema.safeParse(input).success, true);
  for (const extra of [{ restaurantId: 2 }, { userId: 1 }, { payer: 'RESTAURANT' }, { prompt: 'override' }, { model: 'override' }]) {
    assert.equal(managedImageInputSchema.safeParse({ ...input, ...extra }).success, false);
  }
  assert.equal(managedImageInputSchema.safeParse({ ...input, purpose: 'ANY' }).success, false);
  assert.equal(managedImageInputSchema.safeParse({ ...input, imageDataUrl: 'x'.repeat(700_001) }).success, false);
  assert.equal(managedImageInputSchema.safeParse({ ...input, operationId: 'invalid' }).success, false);
});

test('imagens assistidas rejeitam URLs, SVG, MIME divergente, base64 inválido e dados grandes', () => {
  assert.equal(decodeManagedImage(image).mime, 'image/png');
  for (const source of ['https://example.test/image.png', 'http://127.0.0.1/private', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,SGVsbG8=', image.replace('image/png', 'image/jpeg'), `${image} `, `data:image/png;base64,${'A'.repeat(700_000)}`]) {
    assert.throws(() => decodeManagedImage(source));
  }
});

test('IDs devem caber no identificador PostgreSQL positivo do tenant', () => {
  assert.equal(managedImageRestaurantId('12'), 12);
  for (const value of [0, -1, 1.5, 2_147_483_648, NaN, Infinity, 'abc', undefined, null]) assert.throws(() => managedImageRestaurantId(value));
});

test('perfis preservam o produto, o logo e a marca sem inventar alimentos', () => {
  assert.match(getManagedImageProfile('PRODUCT').prompt, /do not add or remove foods/iu);
  assert.match(getManagedImageProfile('LOGO').prompt, /exact lettering/iu);
  assert.match(getManagedImageProfile('COVER').prompt, /do not invent food/iu);
  assert.equal(getManagedImageProfile('COMBO').size, '1024x1024');
  assert.equal(getManagedImageProfile('BANNER').size, '1536x1024');
});
