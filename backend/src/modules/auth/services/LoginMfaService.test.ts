// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

import prisma from '../../../config/prisma.js';
import loginMfaService from './LoginMfaService.js';
import authTokenService from './AuthTokenService.js';
import userRepository from '../repositories/UserRepository.js';

const originalFindUnique = prisma.authMfaChallenge.findUnique;
const originalUpsert = prisma.authMfaChallenge.upsert;
const originalDeleteMany = prisma.authMfaChallenge.deleteMany;
const originalCreateAccessToken = authTokenService.createAccessToken;
const originalCreateRefreshToken = authTokenService.createRefreshToken;
const originalFindByIdWithPassword = userRepository.findByIdWithPassword;
const originalMfaRoles = process.env.MFA_REQUIRED_ROLES;
const originalJwtSecret = process.env.JWT_SECRET;
const originalJwtMfaSecret = process.env.JWT_MFA_SECRET;
const originalSmtpHost = process.env.SMTP_HOST;
const originalSmtpUser = process.env.SMTP_USER;
const originalSmtpPass = process.env.SMTP_PASS;

const challenges = new Map();

afterEach(() => {
  prisma.authMfaChallenge.findUnique = originalFindUnique;
  prisma.authMfaChallenge.upsert = originalUpsert;
  prisma.authMfaChallenge.deleteMany = originalDeleteMany;
  authTokenService.createAccessToken = originalCreateAccessToken;
  authTokenService.createRefreshToken = originalCreateRefreshToken;
  userRepository.findByIdWithPassword = originalFindByIdWithPassword;
  process.env.MFA_REQUIRED_ROLES = originalMfaRoles;
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.JWT_MFA_SECRET = originalJwtMfaSecret;
  process.env.SMTP_HOST = originalSmtpHost;
  process.env.SMTP_USER = originalSmtpUser;
  process.env.SMTP_PASS = originalSmtpPass;
  challenges.clear();
});

function installPrismaMocks() {
  process.env.SMTP_HOST = '';
  process.env.SMTP_USER = '';
  process.env.SMTP_PASS = '';

  prisma.authMfaChallenge.findUnique = async ({ where }) => {
    return challenges.get(Number(where.userId)) || null;
  };

  prisma.authMfaChallenge.upsert = async ({ where, create, update }) => {
    const userId = Number(where.userId);
    const next = {
      userId,
      ...(challenges.get(userId) || {}),
      ...(challenges.has(userId) ? update : create),
    };
    challenges.set(userId, next);
    return next;
  };

  prisma.authMfaChallenge.deleteMany = async ({ where }) => {
    if (where?.expiresAt?.lt) {
      let count = 0;
      for (const [key, value] of challenges.entries()) {
        if (new Date(value.expiresAt).getTime() < new Date(where.expiresAt.lt).getTime()) {
          challenges.delete(key);
          count += 1;
        }
      }
      return { count };
    }

    if (where?.userId) {
      const exists = challenges.has(Number(where.userId));
      challenges.delete(Number(where.userId));
      return { count: exists ? 1 : 0 };
    }

    const total = challenges.size;
    challenges.clear();
    return { count: total };
  };
}

test('deve exigir 2FA para role administrativa configurada', async () => {
  installPrismaMocks();
  process.env.MFA_REQUIRED_ROLES = 'ADMIN,SUPER_ADMIN';
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  process.env.JWT_MFA_SECRET = 'test_mfa_secret_with_minimum_32_chars_123456';

  const result = await loginMfaService.beginIfRequired({
    id: 10,
    role: 'ADMIN',
    restaurantId: 1,
    email: 'admin@pizza.com',
    name: 'Admin',
    active: true,
    mustChangePassword: false,
  });

  assert.equal(result.mfaRequired, true);
  assert.ok(result.mfaToken);
  assert.equal(challenges.has(10), true);
});

test('deve ignorar 2FA para role nao configurada', async () => {
  installPrismaMocks();
  process.env.MFA_REQUIRED_ROLES = 'ADMIN,SUPER_ADMIN';

  const result = await loginMfaService.beginIfRequired({
    id: 11,
    role: 'CLIENTE',
    restaurantId: null,
    email: 'cliente@pizza.com',
    name: 'Cliente',
    active: true,
    mustChangePassword: false,
  });

  assert.equal(result, null);
});

test('deve exigir 2FA quando o proprio cliente o habilita', async () => {
  installPrismaMocks();
  process.env.MFA_REQUIRED_ROLES = 'ADMIN,SUPER_ADMIN';
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  process.env.JWT_MFA_SECRET = 'test_mfa_secret_with_minimum_32_chars_123456';

  const result = await loginMfaService.beginIfRequired({
    id: 12,
    role: 'CLIENTE',
    restaurantId: null,
    email: 'cliente-2fa@pizza.com',
    name: 'Cliente',
    active: true,
    mustChangePassword: false,
    mfaEnabled: true,
  });

  assert.equal(result.mfaRequired, true);
  assert.equal(challenges.has(12), true);
});

test('deve validar codigo 2FA e emitir tokens', async () => {
  installPrismaMocks();
  process.env.MFA_REQUIRED_ROLES = 'ADMIN';
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  process.env.JWT_MFA_SECRET = 'test_mfa_secret_with_minimum_32_chars_123456';

  authTokenService.createAccessToken = () => 'access_test_token';
  authTokenService.createRefreshToken = async () => 'refresh_test_token';
  userRepository.findByIdWithPassword = async () => ({
    id: 77,
    role: 'ADMIN',
    restaurantId: 1,
    email: 'admin@pizza.com',
    name: 'Admin',
    active: true,
    mustChangePassword: false,
    phone: null,
    address: null,
    number: null,
    district: null,
    city: null,
    state: null,
    zipCode: null,
    complement: null,
  });

  const begin = await loginMfaService.beginIfRequired({
    id: 77,
    role: 'ADMIN',
    restaurantId: 1,
    email: 'admin@pizza.com',
    name: 'Admin',
    active: true,
    mustChangePassword: false,
  });

  const challenge = challenges.get(77);
  const validCode = '123456';
  challenge.codeHash = await bcrypt.hash(validCode, 10);
  challenges.set(77, challenge);

  const result = await loginMfaService.verifyAndIssueTokens({
    mfaToken: begin.mfaToken,
    code: validCode,
  });

  assert.equal(result.token, 'access_test_token');
  assert.equal(result.refreshToken, 'refresh_test_token');
  assert.equal(challenges.has(77), false);
});

test('2FA preserva o perfil COZINHA no usuário e nos tokens emitidos', async () => {
  installPrismaMocks();
  process.env.MFA_REQUIRED_ROLES = '';
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  process.env.JWT_MFA_SECRET = 'test_mfa_secret_with_minimum_32_chars_123456';

  let accessPayload;
  let refreshPayload;
  authTokenService.createAccessToken = (payload) => {
    accessPayload = payload;
    return 'kitchen_access_token';
  };
  authTokenService.createRefreshToken = async (payload) => {
    refreshPayload = payload;
    return 'kitchen_refresh_token';
  };
  userRepository.findByIdWithPassword = async () => ({
    id: 78,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 7,
    email: 'cozinha@pizza.com',
    name: 'Cozinha',
    active: true,
    mustChangePassword: false,
    mfaEnabled: true,
  });

  const begin = await loginMfaService.beginIfRequired({
    id: 78,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 7,
    email: 'cozinha@pizza.com',
    name: 'Cozinha',
    active: true,
    mustChangePassword: false,
    mfaEnabled: true,
  });
  const challenge = challenges.get(78);
  challenge.codeHash = await bcrypt.hash('654321', 10);
  challenges.set(78, challenge);

  const result = await loginMfaService.verifyAndIssueTokens({
    mfaToken: begin.mfaToken,
    code: '654321',
  });

  assert.equal(result.user.subRole, 'COZINHA');
  assert.equal(accessPayload.subRole, 'COZINHA');
  assert.equal(refreshPayload.subRole, 'COZINHA');
});
