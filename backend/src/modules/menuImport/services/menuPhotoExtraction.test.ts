import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { photoModeSchema, prepareExtractedItems, readMenuPhoto } from './menuPhotoExtraction.js';
import { reviewedMenuItemPayload } from './MenuImportDraftService.js';

const item = {
  category: 'Pizzas', name: 'Pizza', description: null, price: 20,
  confidence: 0.9, uncertainFields: [], photoBounds: null,
};

async function menuPhoto() {
  const pixels = Buffer.alloc(120 * 60 * 3);
  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < 120; x++) {
      pixels[3 * (y * 120 + x) + (x < 60 ? 0 : 2)] = 255;
    }
  }
  const bytes = await sharp(pixels, { raw: { width: 120, height: 60, channels: 3 } }).png().toBuffer();
  return readMenuPhoto('data:image/png;base64,' + bytes.toString('base64'));
}

test('modo de produto preserva a foto real e deixa preço ausente para revisão', async () => {
  const photo = await menuPhoto();
  const [product] = await prepareExtractedItems(
    { items: [{ ...item, name: null, price: null, imageUrl: 'https://example.org/ignorar' }] },
    'product', photo,
  );
  assert.equal(product.image, photo.url);
  assert.equal(product.price, null);
  assert.equal(product.name, '');
  assert.deepEqual(product.uncertainFields.sort(), ['description', 'name', 'price']);
  await assert.rejects(prepareExtractedItems({ items: [item, item] }, 'product', photo), /apenas um produto/);
});

test('foto do cardápio recorta apenas os pixels associados ao produto', async () => {
  const photo = await menuPhoto();
  const box = { x: 0.5, y: 0, width: 0.5, height: 1 };
  const [withImage, noPhoto, ambiguous, outOfBounds] = await prepareExtractedItems({
    items: [
      { ...item, photoBounds: box },
      { ...item, imageUrl: 'https://example.org/ignorar' },
      { ...item, photoBounds: box, uncertainFields: ['image'] },
      { ...item, photoBounds: { ...box, x: 0.9 } },
    ],
  }, 'menu', photo);
  assert.ok(withImage.image);
  const { data, info } = await sharp(Buffer.from(withImage.image.split(',')[1], 'base64'))
    .raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 60);
  assert.equal(info.height, 60);
  const center = 3 * (30 * 60 + 30);
  assert.ok(data[center] < 20 && data[center + 2] > 235);
  for (const row of [noPhoto, ambiguous, outOfBounds]) {
    assert.equal(row.image, null);
    assert.ok(row.uncertainFields.includes('image'));
  }
});

test('leitura valida arquivo e tipo antes da análise e preserva modo padrão', async () => {
  assert.equal(photoModeSchema.parse(undefined), 'menu');
  assert.equal(photoModeSchema.safeParse('invalid').success, false);
  await assert.rejects(readMenuPhoto('data:image/png;base64,aW52YWxpZA=='), /Envie uma foto/);
  await assert.rejects(readMenuPhoto('https://example.org/foto.png'), /Envie uma foto/);
  const photo = await menuPhoto();
  await assert.rejects(readMenuPhoto(photo.url.replace('image/webp', 'image/png')), /Envie uma foto/);
});

test('alterar o preço mantém a foto original, fotos substituídas e remoção explícita', async () => {
  const photo = await menuPhoto();
  const original = JSON.parse(reviewedMenuItemPayload({ price: 18.5, image: photo.url }, photo.url));
  assert.equal(original.price, 18.5);
  assert.equal(Object.hasOwn(original, 'image'), false);
  const replacement = await readMenuPhoto('data:image/png;base64,' +
    (await sharp({ create: { width: 28, height: 60, channels: 3, background: 'yellow' } }).png().toBuffer()).toString('base64'));
  assert.equal(JSON.parse(reviewedMenuItemPayload({ price: 19, image: replacement.url }, photo.url)).image, replacement.url);
  assert.equal(JSON.parse(reviewedMenuItemPayload({ price: 19, image: null }, photo.url)).image, null);
});
