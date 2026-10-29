import crypto from 'node:crypto';
import { parseCredentialEncryptionKey } from '../../restaurantSettings/security/credentialEncryption.js';

const PREFIX = 'nfc:v1';
const encryptInfo = Buffer.from('gastronexa:nfc:customer:encryption:v1');
const lookupInfo = Buffer.from('gastronexa:nfc:customer:cpf-hmac:v1');

function rootKey() {
  // This module deliberately never stores unencrypted PII, including in development.
  const key = parseCredentialEncryptionKey();
  if (!key) throw new Error('A chave de proteção de dados NFC não está configurada.');
  return key;
}
function derive(key: Buffer, info: Buffer) {
  return Buffer.from(crypto.hkdfSync('sha256', key, Buffer.alloc(0), info, 32));
}
function context(restaurantId: number, customerId: string, field: string) {
  return `nfc-customer:${restaurantId}:${customerId}:${field}`;
}

export function encryptNfcPii(
  restaurantId: number,
  customerId: string,
  field: 'name' | 'cpf' | 'phone',
  plaintext: string,
) {
  const key = derive(rootKey(), encryptInfo);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context(restaurantId, customerId, field)));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [PREFIX, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join(':');
}

export function decryptNfcPii(
  restaurantId: number,
  customerId: string,
  field: 'name' | 'cpf' | 'phone',
  encrypted: string,
) {
  const parts = encrypted.split(':');
  if (parts.length !== 5 || parts[0] !== 'nfc' || parts[1] !== 'v1') {
    throw new Error('Dados NFC protegidos inválidos.');
  }
  const keys = [rootKey()];
  const previous = parseCredentialEncryptionKey(process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS);
  if (previous && !previous.equals(keys[0])) keys.push(previous);
  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', derive(key, encryptInfo), Buffer.from(parts[2], 'base64url'));
      decipher.setAAD(Buffer.from(context(restaurantId, customerId, field)));
      decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(parts[4], 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      // Previous key is accepted during credential rotation, without leaking fields.
    }
  }
  throw new Error('Não foi possível ler os dados NFC protegidos.');
}

export function nfcCpfFingerprints(restaurantId: number, cpf: string) {
  const keys = [rootKey()];
  const previous = parseCredentialEncryptionKey(process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS);
  if (previous && !previous.equals(keys[0])) keys.push(previous);
  return keys.map((key) =>
    crypto.createHmac('sha256', derive(key, lookupInfo)).update(`${restaurantId}:${cpf}`).digest('hex'),
  );
}

export function maskNfcCpf(cpf: string) {
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function maskNfcPhone(phone: string) {
  return `(**) *****-${phone.slice(-4)}`;
}
