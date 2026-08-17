import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRestaurantImage } from './normalizeRestaurantImage.js';

test('aceita URL HTTPS persistente', () => {
  assert.equal(
    normalizeRestaurantImage('https://cdn.example.com/logo.webp'),
    'https://cdn.example.com/logo.webp',
  );
});

test('aceita imagem WebP codificada em data URL', () => {
  const image = 'data:image/webp;base64,UklGRg==';
  assert.equal(normalizeRestaurantImage(image), image);
});

test('rejeita URL blob temporária', () => {
  assert.throws(
    () => normalizeRestaurantImage('blob:http://localhost:5173/temporaria'),
    /temporária/,
  );
});

test('rejeita texto que não representa imagem', () => {
  assert.throws(() => normalizeRestaurantImage('logo-local'), /inválido/);
});
