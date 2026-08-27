import crypto from 'node:crypto';

const ENCRYPTED_PREFIX = 'enc:v1';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export const RESTAURANT_CREDENTIAL_FIELDS = [
  'stripeSecretKey',
  'stripeWebhookSecret',
  'pagbankToken',
  'pagbankRefreshToken',
  'mercadoPagoAccessToken',
  'picpayToken',
  'asaasAccessToken',
] as const;

export function credentialEncryptionContext(restaurantId: number | string, field: string) {
  return `restaurant-settings:${Number(restaurantId)}:${field}`;
}

export function parseCredentialEncryptionKey(rawKey = process.env.CREDENTIAL_ENCRYPTION_KEY) {
  const value = String(rawKey || '').trim();
  if (!value) return null;

  const key = /^[a-f0-9]{64}$/iu.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY deve representar exatamente 32 bytes.');
  }
  return key;
}

function requireKey() {
  const key = parseCredentialEncryptionKey();
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY é obrigatória em produção.');
  }
  return key;
}

export function isEncryptedCredential(value: unknown) {
  return String(value || '').startsWith(`${ENCRYPTED_PREFIX}:`);
}

export function encryptCredential(value: unknown, context: string) {
  if (value === null || value === undefined) return null;
  const plaintext = String(value).trim();
  if (!plaintext || isEncryptedCredential(plaintext)) return plaintext || null;

  const key = requireKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTED_PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

export function decryptCredential(value: unknown, context: string) {
  if (value === null || value === undefined) return null;
  const serialized = String(value).trim();
  if (!serialized || !isEncryptedCredential(serialized)) return serialized || null;

  const key = requireKey();
  if (!key) throw new Error('Chave de criptografia ausente para ler credencial protegida.');
  const parts = serialized.split(':');
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== ENCRYPTED_PREFIX) {
    throw new Error('Formato de credencial criptografada inválido.');
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(parts[2], 'base64url'),
    );
    decipher.setAAD(Buffer.from(context, 'utf8'));
    decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[4], 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Não foi possível descriptografar credencial do gateway.');
  }
}
