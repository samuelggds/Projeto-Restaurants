import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PASSWORD_POLICY,
  collectPasswordErrors,
  collectStrongPasswordErrors,
  generateStrongRandomPassword,
} from './passwordPolicy.js';

test('política base aceita oito caracteres com todas as classes obrigatórias', () => {
  assert.deepEqual(collectPasswordErrors('Segura1!'), []);
});

test('política base rejeita senha com menos de oito caracteres', () => {
  assert.match(collectPasswordErrors('Ab1!xyz').join(' '), /entre 8 e 128 caracteres/u);
});

test('política base exige letra maiúscula', () => {
  assert.match(collectPasswordErrors('segura1!').join(' '), /maiúscula/u);
});

test('política base exige letra minúscula', () => {
  assert.match(collectPasswordErrors('SEGURA1!').join(' '), /minúscula/u);
});

test('política base exige número', () => {
  assert.match(collectPasswordErrors('SenhaBoa!').join(' '), /número/u);
});

test('política base exige caractere especial', () => {
  assert.match(collectPasswordErrors('SenhaBoa1').join(' '), /símbolo/u);
});

test('política base respeita o limite efetivo de 72 bytes do bcrypt', () => {
  const atLimit = `Aa1!${'x'.repeat(PASSWORD_POLICY.maximumUtf8Bytes - 4)}`;
  const aboveLimit = `${atLimit}x`;

  assert.equal(Buffer.byteLength(atLimit, 'utf8'), 72);
  assert.deepEqual(collectPasswordErrors(atLimit), []);
  assert.match(collectPasswordErrors(aboveLimit).join(' '), /máximo 72 bytes/u);
});

test('política administrativa aceita oito caracteres e bloqueia placeholders', () => {
  assert.deepEqual(collectStrongPasswordErrors('Segura1!'), []);
  assert.match(
    collectStrongPasswordErrors('Password-Administrativa-2026!').join(' '),
    /previsível/u,
  );
});

test('gerador interno sempre produz credencial compatível com a política forte', () => {
  const generated = generateStrongRandomPassword();

  assert.deepEqual(collectStrongPasswordErrors(generated), []);
  assert.notEqual(generated, generateStrongRandomPassword());
});
