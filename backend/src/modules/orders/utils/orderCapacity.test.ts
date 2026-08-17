import assert from 'node:assert/strict';
import test from 'node:test';
import { assertOrderCapacity } from './orderCapacity.js';

test('aceita pedidos abaixo do limite simultâneo', () => {
  assert.equal(assertOrderCapacity(2, 3), 3);
});

test('bloqueia pedidos ao atingir o limite simultâneo', () => {
  assert.throws(() => assertOrderCapacity(3, 3), /limite de pedidos/i);
});

test('normaliza limite inválido para o padrão seguro', () => {
  assert.equal(assertOrderCapacity(0, 0), 20);
});
