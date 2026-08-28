import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  decryptCredential,
  credentialNeedsReencryption,
  encryptCredential,
  isEncryptedCredential,
  parseCredentialEncryptionKey,
  reencryptCredential,
} from './credentialEncryption.js';

const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
const originalPreviousKey = process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (originalKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  else process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
  if (originalPreviousKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS;
  else process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS = originalPreviousKey;
  process.env.NODE_ENV = originalNodeEnv;
});

test('lê pela chave anterior e recriptografa atomicamente para a chave atual', () => {
  const previous = Buffer.from('previous-key-0123456789abcdefghi').toString('base64');
  const current = Buffer.from('current-key--0123456789abcdefghi').toString('base64');
  const context = 'restaurant-settings:9:mercadoPagoAccessToken';

  process.env.CREDENTIAL_ENCRYPTION_KEY = previous;
  const oldCiphertext = encryptCredential('old-provider-secret', context);

  process.env.CREDENTIAL_ENCRYPTION_KEY = current;
  process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS = previous;
  assert.equal(decryptCredential(oldCiphertext, context), 'old-provider-secret');
  assert.equal(credentialNeedsReencryption(oldCiphertext, context), true);

  const rotated = reencryptCredential(oldCiphertext, context);
  assert.notEqual(rotated, oldCiphertext);
  assert.equal(credentialNeedsReencryption(rotated, context), false);
  delete process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS;
  assert.equal(decryptCredential(rotated, context), 'old-provider-secret');
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
