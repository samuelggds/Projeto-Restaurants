// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import jwt from 'jsonwebtoken';

import prisma from '../../../config/prisma.js';
import authTokenService from '../services/AuthTokenService.js';
import { resolveAccessToken } from './accessToken.js';

const originalFindUnique = prisma.user.findUnique;
const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;
const originalAllowLegacyAccessTokens = process.env.ALLOW_LEGACY_ACCESS_TOKENS;

afterEach(() => {
  prisma.user.findUnique = originalFindUnique;
  process.env.NODE_ENV = originalNodeEnv;
  process.env.JWT_SECRET = originalJwtSecret;
  if (originalAllowLegacyAccessTokens === undefined) {
    delete process.env.ALLOW_LEGACY_ACCESS_TOKENS;
  } else {
    process.env.ALLOW_LEGACY_ACCESS_TOKENS = originalAllowLegacyAccessTokens;
  }
});

function installAccount(overrides = {}) {
  process.env.JWT_SECRET = 'access-token-test-secret-with-32-characters';
  const account = {
    id: 31,
    active: true,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 9,
    email: 'admin@example.test',
    authVersion: 2,
    mustChangePassword: false,
    ...overrides,
  };
  prisma.user.findUnique = async () => account;
  return account;
}

test('resolve token de acesso versionado com os dados atuais do banco', async () => {
  const account = installAccount();
  const token = authTokenService.createAccessToken({
    id: account.id,
    role: 'CLIENTE',
    restaurantId: null,
    authVersion: account.authVersion,
  });

  const resolved = await resolveAccessToken(token);

  assert.equal(resolved.legacy, false);
  assert.equal(resolved.user.role, 'ADMIN');
  assert.equal(resolved.user.restaurantId, 9);
  assert.equal(resolved.user.mustChangePassword, false);
});

test('propaga do banco a exigência atual de troca de senha', async () => {
  const account = installAccount({ mustChangePassword: true });
  const token = authTokenService.createAccessToken({
    id: account.id,
    role: account.role,
    restaurantId: account.restaurantId,
    authVersion: account.authVersion,
  });

  const resolved = await resolveAccessToken(token);

  assert.equal(resolved.user.mustChangePassword, true);
});

test('rejeita refresh token usado como access mesmo quando o segredo coincide', async () => {
  installAccount();
  const refreshToken = jwt.sign(
    { id: 31, role: 'ADMIN', restaurantId: 9, authVersion: 2, type: 'refresh', jti: 'x' },
    process.env.JWT_SECRET,
  );

  await assert.rejects(() => resolveAccessToken(refreshToken), /Token de acesso inválido/);
});

test('rejeita token legado por padrão também fora de produção', async () => {
  installAccount();
  process.env.NODE_ENV = 'development';
  delete process.env.ALLOW_LEGACY_ACCESS_TOKENS;
  const legacy = jwt.sign({ id: 31, role: 'ADMIN', restaurantId: 9 }, process.env.JWT_SECRET);

  await assert.rejects(() => resolveAccessToken(legacy), /Token de acesso inválido/);
});

test('aceita token legado somente com opt-in explícito fora de produção', async () => {
  installAccount();
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_LEGACY_ACCESS_TOKENS = 'true';
  const legacy = jwt.sign({ id: 31, role: 'ADMIN', restaurantId: 9 }, process.env.JWT_SECRET);

  const resolved = await resolveAccessToken(legacy);

  assert.equal(resolved.legacy, true);
  assert.equal(resolved.user.id, 31);
  assert.equal(resolved.user.role, 'ADMIN');
});

test('produção rejeita token legado mesmo com a flag temporária habilitada', async () => {
  installAccount();
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_LEGACY_ACCESS_TOKENS = 'true';
  const legacy = jwt.sign({ id: 31, role: 'ADMIN', restaurantId: 9 }, process.env.JWT_SECRET);

  await assert.rejects(() => resolveAccessToken(legacy), /Token de acesso inválido/);
});

test('rejeita por padrão token sem type mesmo quando possui authVersion', async () => {
  installAccount();
  process.env.NODE_ENV = 'test';
  delete process.env.ALLOW_LEGACY_ACCESS_TOKENS;
  const legacy = jwt.sign(
    { id: 31, role: 'ADMIN', restaurantId: 9, authVersion: 2 },
    process.env.JWT_SECRET,
  );

  await assert.rejects(() => resolveAccessToken(legacy), /Token de acesso inválido/);
});

test('rejeita conta inativa ou com authVersion divergente', async () => {
  installAccount({ active: false, authVersion: 3 });
  const token = authTokenService.createAccessToken({
    id: 31,
    role: 'ADMIN',
    restaurantId: 9,
    authVersion: 2,
  });

  await assert.rejects(() => resolveAccessToken(token), /Sessão expirada/);
});
