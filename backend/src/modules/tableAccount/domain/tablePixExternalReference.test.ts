import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseTablePixExternalReference,
  tablePixExternalReference,
} from './tablePixExternalReference.js';

test('gera referência Pix da mesa com intent e restaurante', () => {
  assert.equal(tablePixExternalReference(91, 2), 'tablepix_91_2');
});

test('parseia somente referência Pix válida e preserva o tenant', () => {
  assert.deepEqual(parseTablePixExternalReference('tablepix_91_2'), {
    intentId: 91,
    restaurantId: 2,
  });
  assert.equal(parseTablePixExternalReference('tablepix_91_3_extra'), null);
  assert.equal(parseTablePixExternalReference('orderpix:2:91'), null);
});

test('rejeita IDs inválidos', () => {
  assert.throws(() => tablePixExternalReference(0, 2), /inválida/u);
  assert.throws(() => tablePixExternalReference(91, -1), /inválida/u);
});
