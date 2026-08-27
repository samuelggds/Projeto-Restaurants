// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import updateMfaPreferenceService from './UpdateMfaPreferenceService.js';
import deactivateUserService from './DeactivateUserService.js';

const originalTransaction = prisma.$transaction;
const originalMethods = {
  findById: userRepository.findById,
  updateMfaEnabled: userRepository.updateMfaEnabled,
  deactivate: userRepository.deactivate,
};

afterEach(() => {
  prisma.$transaction = originalTransaction;
  Object.assign(userRepository, originalMethods);
});

test('mudança de MFA incrementa versão e revoga refresh na mesma transação', async () => {
  const transaction = {
    authRefreshSession: {
      deleteMany: async ({ where }) => {
        assert.equal(where.userId, 42);
        return { count: 1 };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  userRepository.findById = async () => ({ id: 42 });
  userRepository.updateMfaEnabled = async (id, enabled, db) => {
    assert.equal(id, 42);
    assert.equal(enabled, true);
    assert.equal(db, transaction);
    return { id: 42, mfaEnabled: true };
  };

  const result = await updateMfaPreferenceService.execute(42, true);
  assert.deepEqual(result, { id: 42, mfaEnabled: true });
});

test('desativação devolve somente projeção pública e revoga refresh', async () => {
  const transaction = {
    authRefreshSession: {
      deleteMany: async () => ({ count: 1 }),
    },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  userRepository.findById = async () => ({ id: 7, active: true });
  userRepository.deactivate = async (_id, db) => {
    assert.equal(db, transaction);
    return { id: 7, active: false };
  };

  assert.deepEqual(await deactivateUserService.execute(7), { id: 7, active: false });
});

test('recuperação de senha reativa conta e revoga access tokens antigos', async () => {
  let capturedData;
  const db = {
    user: {
      update: async ({ data }) => {
        capturedData = data;
        return { id: 5 };
      },
    },
  };

  await userRepository.updatePasswordAndClearResetCode(5, 'hash', db);

  assert.equal(capturedData.active, true);
  assert.deepEqual(capturedData.authVersion, { increment: 1 });
  assert.equal(capturedData.resetPasswordCodeHash, null);
});
