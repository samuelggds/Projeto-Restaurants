// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import bcrypt from 'bcrypt';
import userRepository from '../repositories/UserRepository.js';
import updateMfaPreferenceService from './UpdateMfaPreferenceService.js';

const originalTransaction = prisma.$transaction;
const originalFindById = userRepository.findByIdWithPassword;
const originalCompare = bcrypt.compare;
const originalUpdateMfaEnabled = userRepository.updateMfaEnabled;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  userRepository.findByIdWithPassword = originalFindById;
  bcrypt.compare = originalCompare;
  userRepository.updateMfaEnabled = originalUpdateMfaEnabled;
});

function installTransaction() {
  const revoked = { refresh: 0, challenge: 0 };
  prisma.$transaction = async (callback) =>
    callback({
      authRefreshSession: {
        deleteMany: async () => {
          revoked.refresh += 1;
          return { count: 1 };
        },
      },
      authMfaChallenge: {
        deleteMany: async () => {
          revoked.challenge += 1;
          return { count: 1 };
        },
      },
    });
  return revoked;
}

for (const role of ['ADMIN', 'SUPER_ADMIN']) {
  test(`${role} não pode desabilitar MFA nem com senha válida`, async () => {
    const updates: boolean[] = [];
    const revoked = installTransaction();
    userRepository.findByIdWithPassword = async () => ({
      id: 1,
      role,
      active: true,
      mfaEnabled: true,
    });
    userRepository.updateMfaEnabled = async (_id, enabled) => {
      updates.push(enabled);
      return { id: 1, role, mfaEnabled: enabled };
    };

    await assert.rejects(
      () => updateMfaPreferenceService.execute(1, false, 'valid-password'),
      /obrigatória/,
    );
    assert.deepEqual(updates, []);
    assert.deepEqual(revoked, { refresh: 0, challenge: 0 });
  });
}

test('também permite reativar MFA e revoga sessões antigas', async () => {
  const revoked = installTransaction();
  userRepository.findByIdWithPassword = async () => ({
    id: 7,
    role: 'ADMIN',
    active: true,
    mfaEnabled: false,
    password: 'hash',
    authVersion: 3,
  });
  bcrypt.compare = async () => true;
  userRepository.updateMfaEnabled = async (_id, enabled, _db, authVersion) => {
    assert.equal(authVersion, 3);
    return { id: 7, mfaEnabled: enabled };
  };

  const result = await updateMfaPreferenceService.execute(7, true, 'valid-password');

  assert.equal(result.mfaEnabled, true);
  assert.deepEqual(revoked, { refresh: 1, challenge: 1 });
});

test('preferência de cliente exige senha correta e não revoga sessão em tentativa inválida', async () => {
  const revoked = installTransaction();
  userRepository.findByIdWithPassword = async () => ({
    id: 7,
    role: 'CLIENTE',
    active: true,
    password: 'hash',
    authVersion: 3,
  });
  bcrypt.compare = async () => false;
  userRepository.updateMfaEnabled = async () => {
    throw new Error('must not update');
  };
  for (const password of [undefined, 'incorrect', 'x'.repeat(73)]) {
    await assert.rejects(
      () => updateMfaPreferenceService.execute(7, false, password),
      /senha atual/,
    );
  }
  assert.deepEqual(revoked, { refresh: 0, challenge: 0 });
});

test('cliente pode desativar MFA com senha correta e revoga sessões', async () => {
  const revoked = installTransaction();
  userRepository.findByIdWithPassword = async () => ({
    id: 7,
    role: 'CLIENTE',
    active: true,
    password: 'hash',
    authVersion: 3,
  });
  bcrypt.compare = async () => true;
  userRepository.updateMfaEnabled = async (_id, enabled) => ({ id: 7, mfaEnabled: enabled });
  assert.equal(
    (await updateMfaPreferenceService.execute(7, false, 'valid-password')).mfaEnabled,
    false,
  );
  assert.deepEqual(revoked, { refresh: 1, challenge: 1 });
});

test('rejeita valor que não seja booleano', async () => {
  await assert.rejects(
    () => updateMfaPreferenceService.execute(1, 'false'),
    /preferencia de verificacao em duas etapas e obrigatoria/u,
  );
});
