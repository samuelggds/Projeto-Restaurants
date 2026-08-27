// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import prisma from '../../../config/prisma.js';
import authTokenService from './AuthTokenService.js';
import { getJwtRefreshSecret, getJwtSecret } from '../../../config/auth.js';

const originalFindUnique = prisma.authRefreshSession.findUnique;
const originalUpsert = prisma.authRefreshSession.upsert;
const originalUpdateMany = prisma.authRefreshSession.updateMany;
const originalDeleteMany = prisma.authRefreshSession.deleteMany;
const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

const refreshSessions = new Map();

function getSafeRefreshSecret() {
  return getJwtRefreshSecret() || getJwtSecret();
}

afterEach(() => {
  prisma.authRefreshSession.findUnique = originalFindUnique;
  prisma.authRefreshSession.upsert = originalUpsert;
  prisma.authRefreshSession.updateMany = originalUpdateMany;
  prisma.authRefreshSession.deleteMany = originalDeleteMany;
  refreshSessions.clear();
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
});

function installSessionPrismaMocks(user = {
  id: 77,
  active: true,
  role: 'ADMIN',
  subRole: null,
  restaurantId: 1,
  authVersion: 0,
}) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_with_minimum_32_chars_123456';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_with_minimum_32_chars_654321';

  prisma.authRefreshSession.findUnique = async ({ where }) => {
    const session = refreshSessions.get(Number(where.userId));
    return session ? { ...session, user } : null;
  };

  prisma.authRefreshSession.upsert = async ({ where, create, update }) => {
    const userId = Number(where.userId);
    const next = {
      userId,
      ...(refreshSessions.get(userId) || {}),
      ...(refreshSessions.has(userId) ? update : create),
    };
    refreshSessions.set(userId, next);
    return next;
  };

  prisma.authRefreshSession.updateMany = async ({ where, data }) => {
    const userId = Number(where.userId);
    const existing = refreshSessions.get(userId);
    if (
      !existing ||
      String(existing.jti) !== String(where.jti) ||
      new Date(existing.expiresAt).getTime() <= Date.now()
    ) {
      return { count: 0 };
    }

    refreshSessions.set(userId, { ...existing, ...data });
    return { count: 1 };
  };

  prisma.authRefreshSession.deleteMany = async ({ where }) => {
    const userId = Number(where.userId);
    const existing = refreshSessions.get(userId);
    if (existing && String(existing.jti) === String(where.jti)) {
      refreshSessions.delete(userId);
      return { count: 1 };
    }

    return { count: 0 };
  };
}

test('deve rotacionar refresh token e invalidar o token anterior', async () => {
  installSessionPrismaMocks();

  const payload = { id: 77, role: 'ADMIN', restaurantId: 1 };
  const refreshToken = await authTokenService.createRefreshToken(payload);
  const firstRotation = await authTokenService.rotateRefreshToken(refreshToken);

  assert.ok(firstRotation.accessToken);
  assert.ok(firstRotation.refreshToken);
  assert.notEqual(firstRotation.refreshToken, refreshToken);

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(refreshToken),
    /Refresh token expirado|Refresh token invalido/,
  );
});

test('preserva o perfil COZINHA ao rotacionar os tokens', async () => {
  installSessionPrismaMocks({
    id: 79,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 7,
    authVersion: 0,
  });

  const refreshToken = await authTokenService.createRefreshToken({
    id: 79,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 7,
  });
  const rotation = await authTokenService.rotateRefreshToken(refreshToken);

  const accessPayload = jwt.verify(rotation.accessToken, getJwtSecret());
  const refreshPayload = jwt.verify(rotation.refreshToken, getSafeRefreshSecret());

  assert.equal(accessPayload.subRole, 'COZINHA');
  assert.equal(accessPayload.restaurantId, 7);
  assert.equal(refreshPayload.subRole, 'COZINHA');
  assert.equal(refreshPayload.restaurantId, 7);
});

test('logout deve revogar refresh token atual', async () => {
  installSessionPrismaMocks({
    id: 88,
    active: true,
    role: 'CLIENTE',
    subRole: null,
    restaurantId: null,
    authVersion: 0,
  });

  const payload = { id: 88, role: 'CLIENTE', restaurantId: null };
  const refreshToken = await authTokenService.createRefreshToken(payload);

  await authTokenService.revokeRefreshToken(refreshToken);

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(refreshToken),
    /Refresh token expirado|Refresh token invalido/,
  );
});

test('deve rejeitar token que nao seja refresh', async () => {
  installSessionPrismaMocks();

  const accessToken = jwt.sign({ id: 99, role: 'ADMIN', restaurantId: 1 }, getSafeRefreshSecret(), {
    expiresIn: '10m',
  });

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(accessToken),
    /Refresh token invalido/,
  );
});

test('somente uma rotacao concorrente consegue consumir o mesmo refresh token', async () => {
  installSessionPrismaMocks();
  const refreshToken = await authTokenService.createRefreshToken({
    id: 77,
    role: 'ADMIN',
    restaurantId: 1,
  });

  const results = await Promise.allSettled([
    authTokenService.rotateRefreshToken(refreshToken),
    authTokenService.rotateRefreshToken(refreshToken),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
});

test('rejeita refresh quando a versao de autenticacao da conta mudou', async () => {
  installSessionPrismaMocks({
    id: 77,
    active: true,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 1,
    authVersion: 4,
  });
  const refreshToken = await authTokenService.createRefreshToken({
    id: 77,
    role: 'ADMIN',
    restaurantId: 1,
    authVersion: 3,
  });

  await assert.rejects(
    () => authTokenService.rotateRefreshToken(refreshToken),
    /Refresh token expirado/,
  );
});
