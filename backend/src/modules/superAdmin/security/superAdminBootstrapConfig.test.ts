import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectSuperAdminBootstrapConfigErrors,
  resolveSuperAdminBootstrapConfig,
  validateInitialSuperAdminPassword,
} from './superAdminBootstrapConfig.js';

const securePassword = 'V3ry-Str0ng-Bootstrap!';

test('produção habilita o bootstrap por padrão e normaliza sua identidade', () => {
  assert.deepEqual(
    resolveSuperAdminBootstrapConfig({
      NODE_ENV: 'production',
      SUPER_ADMIN_BOOTSTRAP_EMAIL: ' DEV@Example.COM ',
      SUPER_ADMIN_BOOTSTRAP_NAME: ' Desenvolvedor ',
      SUPER_ADMIN_BOOTSTRAP_PASSWORD: securePassword,
    }),
    {
      enabled: true,
      email: 'dev@example.com',
      name: 'Desenvolvedor',
      password: securePassword,
      passwordFile: '',
    },
  );
});

test('fora de produção o bootstrap só executa mediante opt-in explícito', () => {
  assert.deepEqual(resolveSuperAdminBootstrapConfig({ NODE_ENV: 'test' }), {
    enabled: false,
    email: '',
    name: '',
    password: '',
    passwordFile: '',
  });
});

test('valida identidade, fonte única do segredo e caminho absoluto', () => {
  const errors = collectSuperAdminBootstrapConfigErrors({
    NODE_ENV: 'production',
    SUPER_ADMIN_BOOTSTRAP_EMAIL: 'inválido',
    SUPER_ADMIN_BOOTSTRAP_NAME: 'X',
    SUPER_ADMIN_BOOTSTRAP_PASSWORD: securePassword,
    SUPER_ADMIN_BOOTSTRAP_PASSWORD_FILE: 'relative/secret.txt',
  });

  assert.match(errors.join(' '), /email válido/u);
  assert.match(errors.join(' '), /entre 2 e 120/u);
  assert.match(errors.join(' '), /configure somente/u);
  assert.match(errors.join(' '), /caminho absoluto/u);
});

test('senha inicial exige comprimento, diversidade e rejeita placeholders', () => {
  assert.deepEqual(validateInitialSuperAdminPassword(securePassword), []);
  assert.match(validateInitialSuperAdminPassword('password').join(' '), /entre 16.*minúscula.*previsível/u);
  assert.match(validateInitialSuperAdminPassword(`Aa1!${'x'.repeat(69)}`).join(' '), /72 bytes/u);
});
