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

function previousKey(currentKey: Buffer | null) {
  const key = parseCredentialEncryptionKey(process.env.CREDENTIAL_ENCRYPTION_KEY_PREVIOUS);
  if (!key || (currentKey && key.equals(currentKey))) return null;
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

function decryptWithKey(serialized: string, context: string, key: Buffer) {
  const parts = serialized.split(':');
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== ENCRYPTED_PREFIX) {
    throw new Error('Formato de credencial criptografada inválido.');
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[2], 'base64url'));
  decipher.setAAD(Buffer.from(context, 'utf8'));
  decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[4], 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function decryptCredential(value: unknown, context: string) {
  if (value === null || value === undefined) return null;
  const serialized = String(value).trim();
  if (!serialized || !isEncryptedCredential(serialized)) return serialized || null;

  const currentKey = requireKey();
  if (!currentKey) throw new Error('Chave de criptografia ausente para ler credencial protegida.');
  const fallbackKey = previousKey(currentKey);
  const keys = fallbackKey ? [currentKey, fallbackKey] : [currentKey];

  for (const key of keys) {
    try {
      return decryptWithKey(serialized, context, key);
    } catch {
      // Durante a janela de rotação, tenta a chave anterior sem revelar qual
      // versão protege o registro.
    }
  }

  throw new Error('Não foi possível descriptografar credencial do gateway.');
}

export function credentialNeedsReencryption(value: unknown, context: string) {
  const serialized = String(value || '').trim();
  if (!serialized) return false;
  if (!isEncryptedCredential(serialized)) return true;

  const currentKey = requireKey();
  if (!currentKey) throw new Error('Chave de criptografia ausente para ler credencial protegida.');
  try {
    decryptWithKey(serialized, context, currentKey);
    return false;
  } catch {
    const fallbackKey = previousKey(currentKey);
    if (fallbackKey) {
      try {
        decryptWithKey(serialized, context, fallbackKey);
        return true;
      } catch {
        // Mantém uma única mensagem externa para não atuar como oráculo de chave.
      }
    }
    throw new Error('Não foi possível descriptografar credencial do gateway.');
  }
}

export function reencryptCredential(value: unknown, context: string) {
  const plaintext = decryptCredential(value, context);
  return encryptCredential(plaintext, context);
}
