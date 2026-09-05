import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { getJwtSecret } from '../../../config/auth.js';

const TOKEN_TYPE = 'guest-order-tracking';
const TOKEN_ISSUER = 'projeto-restaurants';
const TOKEN_AUDIENCE = 'guest-order-tracking';
const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '3d';

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

export function issueGuestOrderTrackingToken({ orderId, publicId }: GuestOrderTrackingClaims) {
  if (!Number.isInteger(orderId) || orderId <= 0 || !String(publicId || '').trim()) {
    throw new Error('Pedido inválido para acesso de visitante.');
  }

  return jwt.sign(
    {
      type: TOKEN_TYPE,
      orderId,
      publicId: String(publicId),
    },
    getGuestTrackingSecret(),
    {
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

  const decoded = jwt.verify(token, getGuestTrackingSecret(), {
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
