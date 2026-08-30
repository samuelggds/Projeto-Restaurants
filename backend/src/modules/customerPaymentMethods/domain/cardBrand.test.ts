import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStoredCardBrand } from './cardBrand.js';

test('normaliza bandeiras retornadas pelos provedores', () => {
  assert.equal(normalizeStoredCardBrand('master'), 'mastercard');
  assert.equal(normalizeStoredCardBrand('american_express'), 'amex');
  assert.equal(normalizeStoredCardBrand('ELO'), 'elo');
});

test('não persiste um identificador de bandeira arbitrário', () => {
  assert.equal(normalizeStoredCardBrand('<script>'), 'card');
});
