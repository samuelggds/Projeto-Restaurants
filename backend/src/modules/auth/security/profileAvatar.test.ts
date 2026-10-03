import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProfileAvatar } from './profileAvatar.js';

test('aceita avatar JPEG em base64 e URL HTTPS', () => {
  assert.equal(
    normalizeProfileAvatar('data:image/jpeg;base64,Zm90bw=='),
    'data:image/jpeg;base64,Zm90bw==',
  );
  assert.equal(
    normalizeProfileAvatar('https://cdn.example.com/avatar.webp'),
    'https://cdn.example.com/avatar.webp',
  );
});

test('permite remover avatar', () => {
  assert.equal(normalizeProfileAvatar(''), null);
});

test('rejeita SVG, URL HTTP e credenciais embutidas', () => {
  assert.throws(
    () => normalizeProfileAvatar('data:image/svg+xml;base64,PHN2Zy8+'),
    /JPG, PNG ou WEBP/u,
  );
  assert.throws(
    () => normalizeProfileAvatar('http://example.com/avatar.jpg'),
    /HTTPS válida/u,
  );
  assert.throws(
    () => normalizeProfileAvatar('https://user:secret@example.com/avatar.jpg'),
    /HTTPS válida/u,
  );
});
