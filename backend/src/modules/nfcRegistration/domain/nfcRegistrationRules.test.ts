import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNfcCpf, normalizeNfcPhone } from './nfcRegistrationRules.js';

test('valida CPF real e impede número sem dígitos verificadores', () => {
  assert.equal(normalizeNfcCpf('529.982.247-25'), '52998224725');
  assert.throws(() => normalizeNfcCpf('000.000.000-00'), /CPF válido/);
  assert.throws(() => normalizeNfcCpf('529.982.247-26'), /CPF válido/);
});

test('normaliza telefone com DDD e DDI brasileiro', () => {
  assert.equal(normalizeNfcPhone('(85) 99999-9999'), '85999999999');
  assert.equal(normalizeNfcPhone('+55 (85) 99999-9999'), '85999999999');
  assert.throws(() => normalizeNfcPhone('12345'));
});
