import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/prisma.js';
import { getJwtSecret } from '../../../config/auth.js';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export type OAuthProvider = 'MERCADO_PAGO' | 'PAGBANK';

type OAuthStatePayload = {
  type: 'oauth_state';
  provider: OAuthProvider;
  restaurantId: number;
  userId: number;
  authVersion: number;
  nonce: string;
};

function hashNonce(nonce: string) {
  return crypto.createHash('sha256').update(nonce).digest('hex');
}

function assertIdentity(restaurantId: unknown, userId: unknown) {
  const normalizedRestaurantId = Number(restaurantId);
  const normalizedUserId = Number(userId);
  if (!Number.isSafeInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
    throw new Error('Restaurante inválido para iniciar OAuth.');
  }
  if (!Number.isSafeInteger(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error('Usuário inválido para iniciar OAuth.');
  }
  return { restaurantId: normalizedRestaurantId, userId: normalizedUserId };
}

function assertAuthVersion(authVersion: unknown) {
  const normalizedAuthVersion = Number(authVersion);
  if (!Number.isSafeInteger(normalizedAuthVersion) || normalizedAuthVersion < 0) {
    throw new Error('Estado OAuth inválido.');
  }
  return normalizedAuthVersion;
}

function signingSecret() {
  const secret = getJwtSecret();
  if (secret.length < 32) throw new Error('JWT_SECRET inválido para proteger estado OAuth.');
  return secret;
}

export async function createSingleUseOAuthState({
  provider,
  restaurantId,
  userId,
}: {
  provider: OAuthProvider;
  restaurantId: unknown;
  userId: unknown;
}) {
  const identity = assertIdentity(restaurantId, userId);
  const user = await prisma.user.findFirst({
    where: {
      id: identity.userId,
      restaurantId: identity.restaurantId,
      role: 'ADMIN',
      active: true,
    },
    select: { authVersion: true },
  });
  if (!user) {
    throw new Error('Administrador inválido para iniciar OAuth.');
  }

  const authVersion = user.authVersion;
  const nonce = crypto.randomBytes(32).toString('base64url');
  const nonceHash = hashNonce(nonce);
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

  await prisma.oAuthAuthorizationState.upsert({
    where: { provider_userId: { provider, userId: identity.userId } },
    update: {
      restaurantId: identity.restaurantId,
      authVersion,
      nonceHash,
      expiresAt,
      consumedAt: null,
    },
    create: {
      provider,
      ...identity,
      authVersion,
      nonceHash,
      expiresAt,
    },
  });

  const payload: OAuthStatePayload = {
    type: 'oauth_state',
    provider,
    ...identity,
    authVersion,
    nonce,
  };
  return jwt.sign(payload, signingSecret(), { expiresIn: '10m' });
}

export async function consumeSingleUseOAuthState(rawState: unknown, provider: OAuthProvider) {
  const state = String(rawState || '').trim();
  if (!state) throw new Error('State OAuth não recebido.');

  const decoded = jwt.verify(state, signingSecret());
  if (!decoded || typeof decoded === 'string') throw new Error('Estado OAuth inválido.');
  const payload = decoded as Partial<OAuthStatePayload>;
  const identity = assertIdentity(payload.restaurantId, payload.userId);
  const authVersion = assertAuthVersion(payload.authVersion);
  const nonce = String(payload.nonce || '');
  if (payload.type !== 'oauth_state' || payload.provider !== provider || nonce.length < 32) {
    throw new Error('Estado OAuth inválido.');
  }

  const consumedAt = new Date();
  const consumed = await prisma.oAuthAuthorizationState.updateMany({
    where: {
      provider,
      userId: identity.userId,
      restaurantId: identity.restaurantId,
      authVersion,
      nonceHash: hashNonce(nonce),
      consumedAt: null,
      expiresAt: { gt: consumedAt },
      user: {
        is: {
          id: identity.userId,
          active: true,
          role: 'ADMIN',
          restaurantId: identity.restaurantId,
          authVersion,
        },
      },
    },
    data: { consumedAt },
  });
  if (consumed.count !== 1) {
    throw new Error('Estado OAuth expirado, reutilizado ou substituído.');
  }

  return identity;
}
