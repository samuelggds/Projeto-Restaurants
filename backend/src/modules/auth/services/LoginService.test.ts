// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import loginService from './LoginService.js';
import loginLockoutService from './LoginLockoutService.js';
import loginMfaService from './LoginMfaService.js';
import authTokenService from './AuthTokenService.js';
import userRepository from '../repositories/UserRepository.js';

const originals = {
  check: loginLockoutService.check,
  registerFailure: loginLockoutService.registerFailure,
  registerSuccess: loginLockoutService.registerSuccess,
  beginMfa: loginMfaService.beginIfRequired,
  accessToken: authTokenService.createAccessToken,
  refreshToken: authTokenService.createRefreshToken,
  findByEmail: userRepository.findByEmail,
  recordSuccessfulLogin: userRepository.recordSuccessfulLogin,
};

afterEach(() => {
  loginLockoutService.check = originals.check;
  loginLockoutService.registerFailure = originals.registerFailure;
  loginLockoutService.registerSuccess = originals.registerSuccess;
  loginMfaService.beginIfRequired = originals.beginMfa;
  authTokenService.createAccessToken = originals.accessToken;
  authTokenService.createRefreshToken = originals.refreshToken;
  userRepository.findByEmail = originals.findByEmail;
  userRepository.recordSuccessfulLogin = originals.recordSuccessfulLogin;
});

async function installSuccessfulPasswordLogin(events: string[]) {
  const password = 'cliente-seguro-2026';
  const passwordHash = await bcrypt.hash(password, 4);
  loginLockoutService.check = async () => ({ locked: false, waitSeconds: 0 });
  loginLockoutService.registerFailure = async () => ({ locked: false, waitSeconds: 0 });
  loginLockoutService.registerSuccess = async () => undefined;
  userRepository.findByEmail = async () => ({
    id: 15,
    name: 'Cliente',
    email: 'cliente@pizza.test',
    password: passwordHash,
    role: 'CLIENTE',
    subRole: null,
    restaurantId: null,
    authVersion: 0,
    active: true,
    mustChangePassword: false,
    mfaEnabled: false,
  });
  authTokenService.createAccessToken = () => {
    events.push('access-token');
    return 'access';
  };
  authTokenService.createRefreshToken = async () => {
    events.push('refresh-token');
    return 'refresh';
  };
  userRepository.recordSuccessfulLogin = async (userId) => {
    events.push(`last-login:${userId}`);
    return new Date();
  };
  return password;
}

test('registra lastLoginAt somente depois de emitir a sessão completa', async () => {
  const events = [];
  const password = await installSuccessfulPasswordLogin(events);
  loginMfaService.beginIfRequired = async () => null;

  const result = await loginService.execute({
    email: 'CLIENTE@PIZZA.TEST',
    password,
  });

  assert.equal(result.token, 'access');
  assert.equal(result.refreshToken, 'refresh');
  assert.deepEqual(events, ['access-token', 'refresh-token', 'last-login:15']);
});

test('não registra lastLoginAt enquanto o MFA ainda está pendente', async () => {
  const events = [];
  const password = await installSuccessfulPasswordLogin(events);
  loginMfaService.beginIfRequired = async () => ({
    mfaRequired: true,
    mfaToken: 'challenge',
  });

  const result = await loginService.execute({
    email: 'cliente@pizza.test',
    password,
  });

  assert.equal(result.mfaRequired, true);
  assert.deepEqual(events, []);
});
