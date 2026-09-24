import crypto from 'node:crypto';
import prisma from '../../../config/prisma.js';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
export type OAuthProvider = 'MERCADO_PAGO';

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
  // Keep identity only in the database and send a random, single-use bearer nonce.
  const nonce = crypto.randomBytes(32).toString('hex');
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

  return nonce;
}

export async function consumeSingleUseOAuthState(rawState: unknown, provider: OAuthProvider) {
  const state = String(rawState || '').trim();
  if (!state) throw new Error('State OAuth não recebido.');

  if (!/^[a-f0-9]{64}$/.test(state)) throw new Error('Estado OAuth inválido.');
  const nonceHash = hashNonce(state);
  const stored = await prisma.oAuthAuthorizationState.findUnique({ where: { nonceHash } });
  if (!stored) throw new Error('Estado OAuth expirado, reutilizado ou substituído.');
  if (stored.provider !== provider) {
    throw new Error('Estado OAuth inválido.');
  }
  const identity = assertIdentity(stored.restaurantId, stored.userId);
  const authVersion = assertAuthVersion(stored.authVersion);

  const consumedAt = new Date();
  const consumed = await prisma.oAuthAuthorizationState.updateMany({
    where: {
      provider,
      userId: identity.userId,
      restaurantId: identity.restaurantId,
      authVersion,
      nonceHash,
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
