import assert from 'node:assert/strict';
import test from 'node:test';

import {
  passwordSchema,
  strongPasswordSchema,
  temporaryStrongPasswordSchema,
} from './PasswordValidator.js';

test('schema compartilhado aceita senha base válida', () => {
  assert.equal(passwordSchema.parse('Segura1!'), 'Segura1!');
});

test('schema compartilhado informa todos os requisitos ausentes', () => {
  const result = passwordSchema.safeParse('abc');

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message || '', /entre 8 e 128/u);
    assert.match(result.error.issues[0]?.message || '', /maiúscula, número e símbolo/u);
  }
});

test('schemas administrativos aceitam senha forte com exatamente oito caracteres', () => {
  assert.equal(strongPasswordSchema.parse('Segura1!'), 'Segura1!');
  assert.equal(temporaryStrongPasswordSchema.parse('Segura1!'), 'Segura1!');
});

test('schema temporário mantém o rótulo e rejeita menos de oito caracteres', () => {
  const temporary = temporaryStrongPasswordSchema.safeParse('Ab1!xyz');
  assert.equal(temporary.success, false);
  if (!temporary.success) {
    assert.match(temporary.error.issues[0]?.message || '', /senha temporária.*8/u);
  }
});
