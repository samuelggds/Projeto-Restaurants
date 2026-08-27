import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  decryptCredential,
  encryptCredential,
  isEncryptedCredential,
  parseCredentialEncryptionKey,
} from './credentialEncryption.js';

const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  else process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
  process.env.NODE_ENV = originalNodeEnv;
});

test('criptografa com AES-GCM e autentica contexto de tenant/campo', () => {
  process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.from('0123456789abcdef0123456789abcdef').toString(
    'base64',
  );
  const context = 'restaurant-settings:7:asaasAccessToken';
  const encrypted = encryptCredential('token-super-secreto', context);

  assert.equal(isEncryptedCredential(encrypted), true);
  assert.doesNotMatch(String(encrypted), /token-super-secreto/u);
  assert.equal(decryptCredential(encrypted, context), 'token-super-secreto');
  assert.throws(
    () => decryptCredential(encrypted, 'restaurant-settings:8:asaasAccessToken'),
    /Não foi possível descriptografar/,
  );
});

test('mantém leitura compatível com registros legados em texto puro', () => {
  assert.equal(decryptCredential('legacy-token', 'context'), 'legacy-token');
});

test('produção exige chave válida com 32 bytes', () => {
  process.env.NODE_ENV = 'production';
  delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  assert.throws(() => encryptCredential('secret', 'context'), /obrigatória em produção/);
  assert.throws(() => parseCredentialEncryptionKey('curta'), /exatamente 32 bytes/);
});
