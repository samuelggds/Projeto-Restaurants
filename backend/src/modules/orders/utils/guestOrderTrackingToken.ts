import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { getJwtSecret } from '../../../config/auth.js';

const TOKEN_TYPE = 'guest-order-tracking';
const TOKEN_ISSUER = 'projeto-restaurants';
const TOKEN_AUDIENCE = 'guest-order-tracking';
const TOKEN_ALGORITHM = 'HS256' as const;
const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '3d';
const COMPACT_TOKEN_PREFIX = 'g1';
const COMPACT_EXPIRES_IN_SECONDS = 3 * 24 * 60 * 60;
const COMPACT_SIGNATURE_BYTES = 16;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

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

type GuestOrderTrackingClaims = {
  orderId: number;
  publicId: string;
};

function compactUuid(publicId: string) {
  const normalized = String(publicId || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(normalized)) return '';
  return Buffer.from(normalized.replace(/-/gu, ''), 'hex').toString('base64url');
}

function expandCompactUuid(value: string) {
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length !== 16) return '';
    const hex = bytes.toString('hex');
    const uuid = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
    return UUID_PATTERN.test(uuid) ? uuid : '';
  } catch {
    return '';
  }
}

function compactSignature(orderId: number, publicIdPart: string, expiresAtPart: string) {
  return createHmac('sha256', getGuestTrackingSecret())
    .update(`${COMPACT_TOKEN_PREFIX}.${orderId}.${publicIdPart}.${expiresAtPart}`)
    .digest()
    .subarray(0, COMPACT_SIGNATURE_BYTES)
    .toString('base64url');
}

function issueCompactToken({ orderId, publicId }: GuestOrderTrackingClaims) {
  const publicIdPart = compactUuid(publicId);
  if (!publicIdPart) return '';
  const expiresAtPart = (Math.floor(Date.now() / 1000) + COMPACT_EXPIRES_IN_SECONDS).toString(36);
  const signature = compactSignature(orderId, publicIdPart, expiresAtPart);
  return `${COMPACT_TOKEN_PREFIX}.${publicIdPart}.${expiresAtPart}.${signature}`;
}

function verifyCompactToken(token: string, expectedOrderId: number): GuestOrderTrackingClaims {
  const [prefix, publicIdPart, expiresAtPart, signature, extra] = token.split('.');
  if (
    prefix !== COMPACT_TOKEN_PREFIX ||
    !publicIdPart ||
    !expiresAtPart ||
    !signature ||
    extra !== undefined
  ) {
    throw new Error('Acesso de visitante inválido.');
  }

  const expiresAt = Number.parseInt(expiresAtPart, 36);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new Error('Acesso de visitante inválido ou expirado.');
  }

  const expectedSignature = Buffer.from(
    compactSignature(expectedOrderId, publicIdPart, expiresAtPart),
    'base64url',
  );
  let providedSignature: Buffer;
  try {
    providedSignature = Buffer.from(signature, 'base64url');
  } catch {
    throw new Error('Acesso de visitante inválido.');
  }
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) {
    throw new Error('Acesso de visitante inválido.');
  }

  const publicId = expandCompactUuid(publicIdPart);
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