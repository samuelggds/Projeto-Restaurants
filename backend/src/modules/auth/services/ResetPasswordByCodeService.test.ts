// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import bcrypt from 'bcrypt';

import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import resetPasswordByCodeService from './ResetPasswordByCodeService.js';

const originalTransaction = prisma.$transaction;
const originalFindByEmail = userRepository.findByEmail;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  userRepository.findByEmail = originalFindByEmail;
});

async function installResetState() {
  const state = {
    id: 21,
    email: 'client@example.test',
    resetPasswordCodeHash: await bcrypt.hash('123456', 4),
    resetPasswordCodeExpiresAt: new Date(Date.now() + 60_000),
    resetPasswordFailedAttempts: 0,
    resetPasswordLockedUntil: null,
    active: false,
    authVersion: 2,
    role: 'CLIENTE',
    mustChangePassword: false,
  };
  let revoked = 0;
  userRepository.findByEmail = async () => ({ ...state });

  const transaction = {
    user: {
      updateMany: async ({ where, data }) => {
        if (where.resetPasswordCodeHash !== state.resetPasswordCodeHash) return { count: 0 };
        if (data.resetPasswordFailedAttempts?.increment) {
          if (state.resetPasswordFailedAttempts >= 5) return { count: 0 };
          state.resetPasswordFailedAttempts += 1;
          return { count: 1 };
        }
        if (data.resetPasswordLockedUntil) {
          state.resetPasswordCodeHash = null;
          state.resetPasswordCodeExpiresAt = null;
          state.resetPasswordLockedUntil = data.resetPasswordLockedUntil;
          return { count: 1 };
        }
        if (data.password) {
          state.password = data.password;
          state.resetPasswordCodeHash = null;
          state.resetPasswordCodeExpiresAt = null;
          state.resetPasswordFailedAttempts = 0;
          state.resetPasswordLockedUntil = null;
          state.active = true;
          state.authVersion += 1;
          return { count: 1 };
        }
        return { count: 0 };
      },
      findUnique: async () => ({
        resetPasswordFailedAttempts: state.resetPasswordFailedAttempts,
      }),
    },
    authRefreshSession: {
      deleteMany: async () => {
        revoked += 1;
        return { count: 1 };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  return { state, revoked: () => revoked };
}

const validPayload = {
  email: 'client@example.test',
  code: '123456',
  newPassword: 'new-password-123',
  confirmPassword: 'new-password-123',
};

test('bloqueia recuperação após cinco códigos inválidos', async () => {
  const { state } = await installResetState();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(
      () => resetPasswordByCodeService.execute({ ...validPayload, code: '000000' }),
      /Codigo invalido ou expirado/,
    );
  }

  assert.equal(state.resetPasswordCodeHash, null);
  assert.ok(state.resetPasswordLockedUntil instanceof Date);
});

test('código válido é consumido uma vez, reativa conta e revoga sessões', async () => {
  const { state, revoked } = await installResetState();
  const results = await Promise.allSettled([
    resetPasswordByCodeService.execute(validPayload),
    resetPasswordByCodeService.execute(validPayload),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(state.active, true);
  assert.equal(state.authVersion, 3);
  assert.equal(revoked(), 1);
});

test('SUPER_ADMIN não consegue redefinir a conta com senha fraca', async () => {
  const { state, revoked } = await installResetState();
  state.role = 'SUPER_ADMIN';

  await assert.rejects(
    () => resetPasswordByCodeService.execute(validPayload),
    /entre 16 e 128 caracteres|previsível/,
  );

  assert.notEqual(state.resetPasswordCodeHash, null);
  assert.equal(state.authVersion, 2);
  assert.equal(revoked(), 0);
});
