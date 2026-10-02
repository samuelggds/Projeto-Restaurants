import assert from 'node:assert/strict';
import test from 'node:test';
import {
  tableCardExternalReference,
  tableCardExternalReferenceCandidates,
} from './tableCardExternalReference.js';

test('referência de cartão da mesa usa namespace separado de pedidos', () => {
  assert.equal(tableCardExternalReference(91, 7), 'tablecard_91_7');
  assert.notEqual(tableCardExternalReference(91, 7), 'ordercard_91_7');
});

test('candidatos preservam compatibilidade sem perder a referência canônica', () => {
  const references = tableCardExternalReferenceCandidates(91, 7);
  assert.equal(references[0], 'tablecard_91_7');
  assert.equal(references.includes('ordercard_91_7'), true);
});

test('referência rejeita ids inválidos', () => {
  assert.throws(() => tableCardExternalReference(0, 7), /inválida/u);
  assert.throws(() => tableCardExternalReference(91, 0), /inválida/u);
});
