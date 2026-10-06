import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeMercadoPagoPaymentMethodId,
  normalizeStoredCardBrand,
} from './cardBrand.js';

test('normaliza bandeiras retornadas pelos provedores', () => {
  assert.equal(normalizeStoredCardBrand('master'), 'mastercard');
  assert.equal(normalizeStoredCardBrand('american_express'), 'amex');
  assert.equal(normalizeStoredCardBrand('ELO'), 'elo');
});

test('não persiste um identificador de bandeira arbitrário', () => {
  assert.equal(normalizeStoredCardBrand('<script>'), 'card');
});


test('converte a bandeira persistida para o id aceito pelo Mercado Pago', () => {
  assert.equal(normalizeMercadoPagoPaymentMethodId('mastercard'), 'master');
  assert.equal(normalizeMercadoPagoPaymentMethodId('master'), 'master');
  assert.equal(normalizeMercadoPagoPaymentMethodId('american_express'), 'amex');
  assert.equal(normalizeMercadoPagoPaymentMethodId('visa'), 'visa');
  assert.equal(normalizeMercadoPagoPaymentMethodId('card'), '');
});
