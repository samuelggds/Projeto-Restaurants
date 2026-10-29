import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeInPersonServiceMode } from './inPersonServiceMode.js';

test('conserva QR Code como padrão de todos os restaurantes existentes', () => {
  assert.equal(normalizeInPersonServiceMode(undefined), 'QR_ONLY');
  assert.equal(normalizeInPersonServiceMode('QR_ONLY'), 'QR_ONLY');
});

test('rejeita valores arbitrários e não permite ativar NFC antes da homologação', () => {
  assert.throws(() => normalizeInPersonServiceMode(null), /inválida/);
  assert.throws(() => normalizeInPersonServiceMode('INVALID'), /inválida/);
  assert.throws(() => normalizeInPersonServiceMode('NFC_ONLY'), /não estão disponíveis/);
  assert.throws(() => normalizeInPersonServiceMode('BOTH'), /não estão disponíveis/);
});
