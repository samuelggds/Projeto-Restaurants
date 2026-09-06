import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { getJwtSecret } from '../../../config/auth.js';

const TOKEN_TYPE = 'guest-order-ownership';
const TOKEN_ISSUER = 'projeto-restaurants';
const TOKEN_AUDIENCE = 'guest-order-ownership';
const TOKEN_ALGORITHM = 'HS256' as const;
const DEFAULT_EXPIRES_IN: SignOptions['expiresIn'] = '90d';

function getGuestOwnershipSecret() {
  const secret = String(
    process.env.GUEST_ORDER_OWNERSHIP_SECRET ||
      process.env.GUEST_ORDER_TRACKING_SECRET ||
      getJwtSecret(),
  ).trim();

  if (!secret) {
    throw new Error(
      'GUEST_ORDER_OWNERSHIP_SECRET, GUEST_ORDER_TRACKING_SECRET ou JWT_SECRET não configurado.',
    );
  }

  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('O segredo de propriedade do pedido deve ter pelo menos 32 caracteres.');
  }

  return secret;
}

type GuestOrderOwnershipClaims = {
  orderId: number;
  publicId: string;
};

export function issueGuestOrderOwnershipToken({ orderId, publicId }: GuestOrderOwnershipClaims) {
  if (!Number.isInteger(orderId) || orderId <= 0 || !String(publicId || '').trim()) {
    throw new Error('Pedido inválido para comprovação de propriedade do visitante.');
  }

  return jwt.sign(
    {
      type: TOKEN_TYPE,
      orderId,
      publicId: String(publicId),
    },
    getGuestOwnershipSecret(),
    {
      algorithm: TOKEN_ALGORITHM,
      expiresIn: DEFAULT_EXPIRES_IN,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    },
  );
}

export function verifyGuestOrderOwnershipToken(
  rawToken: string,
  expectedOrderId: number,
): GuestOrderOwnershipClaims {
  const token = String(rawToken || '').trim();
  if (!token || !Number.isInteger(expectedOrderId) || expectedOrderId <= 0) {
    throw new Error('Comprovação de propriedade do pedido inválida.');
  }

  const decoded = jwt.verify(token, getGuestOwnershipSecret(), {
    algorithms: [TOKEN_ALGORITHM],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Comprovação de propriedade do pedido inválida.');
  }

  const payload = decoded as JwtPayload;
  const orderId = Number(payload.orderId || 0);
  const publicId = String(payload.publicId || '').trim();
  if (payload.type !== TOKEN_TYPE || orderId !== expectedOrderId || !publicId) {
    throw new Error('Comprovação de propriedade do pedido inválida.');
  }

  return { orderId, publicId };
}
