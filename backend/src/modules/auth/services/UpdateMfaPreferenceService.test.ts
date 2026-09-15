// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import updateMfaPreferenceService from './UpdateMfaPreferenceService.js';

const originalTransaction = prisma.$transaction;
const originalFindById = userRepository.findById;
const originalUpdateMfaEnabled = userRepository.updateMfaEnabled;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  userRepository.findById = originalFindById;
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
  test(`${role} pode desabilitar MFA por escolha da própria conta`, async () => {
    const updates: boolean[] = [];
    const revoked = installTransaction();
    userRepository.findById = async () => ({ id: 1, role, mfaEnabled: true });
    userRepository.updateMfaEnabled = async (_id, enabled) => {
      updates.push(enabled);
      return { id: 1, role, mfaEnabled: enabled };
    };

    const result = await updateMfaPreferenceService.execute(1, false);

    assert.deepEqual(updates, [false]);
    assert.equal(result.mfaEnabled, false);
    assert.deepEqual(revoked, { refresh: 1, challenge: 1 });
  });
}

test('também permite reativar MFA e revoga sessões antigas', async () => {
  const revoked = installTransaction();
  userRepository.findById = async () => ({ id: 7, role: 'ADMIN', mfaEnabled: false });
  userRepository.updateMfaEnabled = async (_id, enabled) => ({ id: 7, mfaEnabled: enabled });

  const result = await updateMfaPreferenceService.execute(7, true);

  assert.equal(result.mfaEnabled, true);
  assert.deepEqual(revoked, { refresh: 1, challenge: 1 });
});

test('rejeita valor que não seja booleano', async () => {
  await assert.rejects(
    () => updateMfaPreferenceService.execute(1, 'false'),
    /preferencia de verificacao em duas etapas e obrigatoria/u,
  );
});
