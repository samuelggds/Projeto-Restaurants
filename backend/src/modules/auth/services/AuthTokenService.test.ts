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
const originalTransaction = prisma.$transaction;
const originalUserUpdateMany = prisma.user.updateMany;
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
  prisma.$transaction = originalTransaction;
  prisma.user.updateMany = originalUserUpdateMany;
  refreshSessions.clear();
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.JWT_REFRESH_SECRET = originalJwtRefreshSecret;
});

function installSessionPrismaMocks(
  user = {
    id: 77,
    active: true,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 1,
    authVersion: 0,
  },
) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_with_minimum_32_chars_123456';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_with_minimum_32_chars_654321';

  const activeUser = { ...user };

  prisma.authRefreshSession.findUnique = async ({ where }) => {
    const session = refreshSessions.get(Number(where.userId));
    return session ? { ...session, user: { ...activeUser } } : null;
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

  prisma.user.updateMany = async ({ where, data }) => {
    if (
      Number(where.id) !== Number(activeUser.id) ||
      Number(where.authVersion) !== Number(activeUser.authVersion)
    ) {
      return { count: 0 };
    }

    activeUser.authVersion += Number(data.authVersion?.increment || 0);
    return { count: 1 };
  };

  prisma.$transaction = async (callback) => {
    const sessionSnapshot = new Map(
      [...refreshSessions.entries()].map(([key, value]) => [key, { ...value }]),
    );
    const authVersionSnapshot = activeUser.authVersion;

    try {
      return await callback({
        authRefreshSession: {
          findUnique: prisma.authRefreshSession.findUnique,
          deleteMany: prisma.authRefreshSession.deleteMany,
        },
        user: {
          updateMany: prisma.user.updateMany,
        },
      });
    } catch (error) {
      refreshSessions.clear();
      for (const [key, value] of sessionSnapshot) refreshSessions.set(key, value);
      activeUser.authVersion = authVersionSnapshot;
      throw error;
    }
  };

  return {
    user: activeUser,
    sessions: refreshSessions,
  };
}

test('reutilizacao do token anterior revoga toda a familia e incrementa authVersion', async () => {
  const state = installSessionPrismaMocks();

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

  assert.equal(state.sessions.has(77), false);
  assert.equal(state.user.authVersion, 1);
  await assert.rejects(
    () => authTokenService.rotateRefreshToken(firstRotation.refreshToken),
    /Refresh token expirado/,
  );
});

test('rotaciona token legado e detecta replay pela familia derivada', async () => {
  const state = installSessionPrismaMocks();
  const legacyJti = '7c406665-782c-4ad8-b4af-219899bfd528';
  const legacyToken = jwt.sign(
    {
      id: 77,
      role: 'ADMIN',
      restaurantId: 1,
      authVersion: 0,
      type: 'refresh',
      jti: legacyJti,
    },
    getSafeRefreshSecret(),
    { expiresIn: '10m' },
  );
  const decodedLegacy = jwt.decode(legacyToken);

  state.sessions.set(77, {
    userId: 77,
    jti: legacyJti,
    expiresAt: new Date(Number(decodedLegacy.exp) * 1000),
  });

  const rotation = await authTokenService.rotateRefreshToken(legacyToken);
  const rotatedPayload = jwt.verify(rotation.refreshToken, getSafeRefreshSecret());

  assert.ok(rotatedPayload.familyId);
  assert.equal(state.sessions.get(77).jti.startsWith(`${rotatedPayload.familyId}.`), true);

  await assert.rejects(() => authTokenService.rotateRefreshToken(legacyToken), /expirado/);
  assert.equal(state.sessions.has(77), false);
  assert.equal(state.user.authVersion, 1);
});

test('replay de familia antiga nao revoga uma familia criada por novo login', async () => {
  const state = installSessionPrismaMocks();
  const payload = { id: 77, role: 'ADMIN', restaurantId: 1, authVersion: 0 };
  const oldToken = await authTokenService.createRefreshToken(payload);
  await authTokenService.rotateRefreshToken(oldToken);

  const newLoginToken = await authTokenService.createRefreshToken(payload);
  const newLoginPayload = jwt.verify(newLoginToken, getSafeRefreshSecret());
  const newLoginPersistedJti = state.sessions.get(77).jti;

  await assert.rejects(() => authTokenService.rotateRefreshToken(oldToken), /expirado/);

  assert.equal(state.user.authVersion, 0);
  assert.equal(state.sessions.get(77).jti, newLoginPersistedJti);
  assert.equal(newLoginPersistedJti.startsWith(`${newLoginPayload.familyId}.`), true);

  const validRotation = await authTokenService.rotateRefreshToken(newLoginToken);
  assert.ok(validRotation.accessToken);
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
  const state = installSessionPrismaMocks();
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
  assert.equal(state.sessions.has(77), false);
  assert.equal(state.user.authVersion, 1);

  const successfulRotation = results.find((result) => result.status === 'fulfilled').value;
  await assert.rejects(
    () => authTokenService.rotateRefreshToken(successfulRotation.refreshToken),
    /Refresh token expirado/,
  );
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
