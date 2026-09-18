import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mercadoPagoCardExternalReference,
  mercadoPagoCardExternalReferenceCandidates,
  parseMercadoPagoCardExternalReference,
} from './mercadoPagoCardReference.js';

test('gera referência de cartão Mercado Pago compatível com Orders API', () => {
  const reference = mercadoPagoCardExternalReference(901, 7);
  assert.equal(reference, 'ordercard_901_7');
  assert.match(reference, /^[A-Za-z0-9_-]+$/);
  assert.equal(reference.includes(':'), false);
});

test('mantém compatibilidade de leitura com referências históricas', () => {
  for (const reference of ['ordercard_901_7', 'ordercard:901:7', 'ordercard-901-7']) {
    assert.deepEqual(parseMercadoPagoCardExternalReference(reference), {
      orderId: 901,
      restaurantId: 7,
    });
  }

  assert.deepEqual(mercadoPagoCardExternalReferenceCandidates(901, 7), [
    'ordercard_901_7',
    'ordercard:901:7',
    'ordercard-901-7',
  ]);
});

test('rejeita referência malformada ou de outro fluxo', () => {
  assert.equal(parseMercadoPagoCardExternalReference('orderpix:7:901'), null);
  assert.equal(parseMercadoPagoCardExternalReference('ordercard_0_7'), null);
  assert.equal(parseMercadoPagoCardExternalReference('ordercard_901_0'), null);
  assert.equal(parseMercadoPagoCardExternalReference('ordercard_901:7'), null);
});
