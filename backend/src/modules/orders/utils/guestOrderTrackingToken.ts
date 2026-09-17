import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { getJwtSecret } from '../../../config/auth.js';

const TOKEN_TYPE = 'guest-order-tracking';
const TOKEN_ISSUER = 'projeto-restaurants';
const TOKEN_AUDIENCE = 'guest-order-tracking';
const TOKEN_ALGORITHM = 'HS256' as const;
const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '3d';
const COMPACT_TOKEN_PREFIX = 'g3';
const COMPACT_EXPIRES_IN_SECONDS = 3 * 24 * 60 * 60;
const COMPACT_CIPHER_ALGORITHM = 'aes-256-gcm' as const;
const COMPACT_KEY_BYTES = 32;
const COMPACT_IV_BYTES = 12;
const COMPACT_AUTH_TAG_BYTES = 16;
const COMPACT_PUBLIC_ID_BYTES = 16;
const COMPACT_EXPIRY_BYTES = 4;
const COMPACT_PAYLOAD_BYTES = COMPACT_PUBLIC_ID_BYTES + COMPACT_EXPIRY_BYTES;
const COMPACT_BLOB_BYTES = COMPACT_IV_BYTES + COMPACT_PAYLOAD_BYTES + COMPACT_AUTH_TAG_BYTES;
const COMPACT_KEY_SALT = 'gastronexa:guest-order-tracking';
const COMPACT_KEY_INFO = 'compact-token:v3';
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

let cachedCompactEncryptionKey: { secret: string; key: Buffer } | null = null;

function getGuestTrackingSecret() {
  const secret = String(process.env.GUEST_ORDER_TRACKING_SECRET || getJwtSecret()).trim();

  if (!secret) {
    throw new Error('GUEST_ORDER_TRACKING_SECRET ou JWT_SECRET não configurado.');
  }

  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('GUEST_ORDER_TRACKING_SECRET deve ter pelo menos 32 caracteres em produção.');
  }

  return secret;
}

function getCompactEncryptionKey() {
  const secret = getGuestTrackingSecret();
  if (cachedCompactEncryptionKey?.secret === secret) return cachedCompactEncryptionKey.key;

  const key = Buffer.from(
    hkdfSync('sha256', secret, COMPACT_KEY_SALT, COMPACT_KEY_INFO, COMPACT_KEY_BYTES),
  );
  cachedCompactEncryptionKey = { secret, key };
  return key;
}

type GuestOrderTrackingClaims = {
  orderId: number;
  publicId: string;
};

function uuidToBytes(publicId: string) {
  const normalized = String(publicId || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) return null;
  return Buffer.from(normalized.replace(/-/gu, ''), 'hex');
}

function bytesToUuid(bytes: Buffer) {
  if (bytes.length !== COMPACT_PUBLIC_ID_BYTES) return '';
  const hex = bytes.toString('hex');
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
  return UUID_PATTERN.test(uuid) ? uuid : '';
}

function compactAdditionalData(orderId: number) {
  return Buffer.from(`${COMPACT_TOKEN_PREFIX}.${orderId}`, 'utf8');
}

function issueCompactToken({ orderId, publicId }: GuestOrderTrackingClaims) {
  const publicIdBytes = uuidToBytes(publicId);
  if (!publicIdBytes) return '';

  const expiresAt = Math.floor(Date.now() / 1000) + COMPACT_EXPIRES_IN_SECONDS;
  if (!Number.isSafeInteger(expiresAt) || expiresAt > 0xffffffff) {
    throw new Error('Não foi possível gerar o acesso de visitante.');
  }

  const payload = Buffer.alloc(COMPACT_PAYLOAD_BYTES);
  publicIdBytes.copy(payload, 0);
  payload.writeUInt32BE(expiresAt, COMPACT_PUBLIC_ID_BYTES);

  const iv = randomBytes(COMPACT_IV_BYTES);
  const cipher = createCipheriv(COMPACT_CIPHER_ALGORITHM, getCompactEncryptionKey(), iv, {
    authTagLength: COMPACT_AUTH_TAG_BYTES,
  });
  cipher.setAAD(compactAdditionalData(orderId));

  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const sealed = Buffer.concat([iv, ciphertext, authTag]);

  return `${COMPACT_TOKEN_PREFIX}.${sealed.toString('base64url')}`;
}

function verifyCompactToken(token: string, expectedOrderId: number): GuestOrderTrackingClaims {
  const [prefix, encoded, extra] = token.split('.');
  if (
    prefix !== COMPACT_TOKEN_PREFIX ||
    !encoded ||
    extra !== undefined ||
    !BASE64URL_PATTERN.test(encoded)
  ) {
    throw new Error('Acesso de visitante inválido.');
  }

  let sealed: Buffer;
  try {
    sealed = Buffer.from(encoded, 'base64url');
  } catch {
    throw new Error('Acesso de visitante inválido.');
  }

  if (sealed.length !== COMPACT_BLOB_BYTES) {
    throw new Error('Acesso de visitante inválido.');
  }

  const iv = sealed.subarray(0, COMPACT_IV_BYTES);
  const ciphertext = sealed.subarray(COMPACT_IV_BYTES, COMPACT_IV_BYTES + COMPACT_PAYLOAD_BYTES);
  const authTag = sealed.subarray(COMPACT_IV_BYTES + COMPACT_PAYLOAD_BYTES);

  let payload: Buffer;
  try {
    const decipher = createDecipheriv(COMPACT_CIPHER_ALGORITHM, getCompactEncryptionKey(), iv, {
      authTagLength: COMPACT_AUTH_TAG_BYTES,
    });
    decipher.setAAD(compactAdditionalData(expectedOrderId));
    decipher.setAuthTag(authTag);
    payload = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Acesso de visitante inválido.');
  }

  if (payload.length !== COMPACT_PAYLOAD_BYTES) {
    throw new Error('Acesso de visitante inválido.');
  }

  const expiresAt = payload.readUInt32BE(COMPACT_PUBLIC_ID_BYTES);
  if (expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error('Acesso de visitante inválido ou expirado.');
  }

  const publicId = bytesToUuid(payload.subarray(0, COMPACT_PUBLIC_ID_BYTES));
  if (!publicId) throw new Error('Acesso de visitante inválido.');

  return { orderId: expectedOrderId, publicId };
}

export function issueGuestOrderTrackingToken({ orderId, publicId }: GuestOrderTrackingClaims) {
  if (!Number.isInteger(orderId) || orderId <= 0 || !String(publicId || '').trim()) {
    throw new Error('Pedido inválido para acesso de visitante.');
  }

  const compactToken = issueCompactToken({ orderId, publicId });
  if (compactToken) return compactToken;

  // Compatibilidade para dados legados que não usam UUID como publicId.
  return jwt.sign(
    {
      type: TOKEN_TYPE,
      orderId,
      publicId: String(publicId),
    },
    getGuestTrackingSecret(),
    {
      algorithm: TOKEN_ALGORITHM,
      expiresIn: DEFAULT_EXPIRES_IN,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    },
  );
}

export function verifyGuestOrderTrackingToken(
  rawToken: string,
  expectedOrderId: number,
): GuestOrderTrackingClaims {
  const token = String(rawToken || '').trim();
  if (!token || !Number.isInteger(expectedOrderId) || expectedOrderId <= 0) {
    throw new Error('Acesso de visitante inválido.');
  }

  if (token.startsWith(`${COMPACT_TOKEN_PREFIX}.`)) {
    return verifyCompactToken(token, expectedOrderId);
  }

  // Links enviados antes da compactação continuam válidos até o JWT expirar.
  const decoded = jwt.verify(token, getGuestTrackingSecret(), {
    algorithms: [TOKEN_ALGORITHM],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Acesso de visitante inválido.');
  }

  const payload = decoded as JwtPayload;
  const orderId = Number(payload.orderId || 0);
  const publicId = String(payload.publicId || '').trim();
  if (payload.type !== TOKEN_TYPE || orderId !== expectedOrderId || !publicId) {
    throw new Error('Acesso de visitante inválido.');
  }

  return { orderId, publicId };
}