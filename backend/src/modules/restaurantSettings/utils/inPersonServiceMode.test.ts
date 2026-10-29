import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeInPersonServiceMode } from './inPersonServiceMode.js';

test('conserva QR Code como padrão de todos os restaurantes existentes', () => {
  assert.equal(normalizeInPersonServiceMode(undefined), 'QR_ONLY');
  assert.equal(normalizeInPersonServiceMode('QR_ONLY'), 'QR_ONLY');
});

test('aceita as três modalidades por tenant sem aceitar valores arbitrários', () => {
  assert.throws(() => normalizeInPersonServiceMode(null), /inválida/);
  assert.throws(() => normalizeInPersonServiceMode('INVALID'), /inválida/);
  assert.equal(normalizeInPersonServiceMode('NFC_ONLY'), 'NFC_ONLY');
  assert.equal(normalizeInPersonServiceMode('BOTH'), 'BOTH');
});
