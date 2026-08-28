// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import updateMfaPreferenceService from './UpdateMfaPreferenceService.js';

const originalTransaction = prisma.$transaction;
const originalFindById = userRepository.findById;
const originalUpdateMfaEnabled = userRepository.updateMfaEnabled;
const originalMfaRoles = process.env.MFA_REQUIRED_ROLES;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  userRepository.findById = originalFindById;
  userRepository.updateMfaEnabled = originalUpdateMfaEnabled;
  if (originalMfaRoles === undefined) delete process.env.MFA_REQUIRED_ROLES;
  else process.env.MFA_REQUIRED_ROLES = originalMfaRoles;
});

async function assertCannotDisable(role: string) {
  let updated = false;
  userRepository.findById = async () => ({ id: 1, role });
  userRepository.updateMfaEnabled = async () => {
    updated = true;
  };
  prisma.$transaction = async (callback) => callback({});

  await assert.rejects(
    () => updateMfaPreferenceService.execute(1, false),
    /verificacao em duas etapas e obrigatoria/u,
  );
  assert.equal(updated, false);
}

test('SUPER_ADMIN nunca pode desabilitar MFA', async () => {
  process.env.MFA_REQUIRED_ROLES = '';
  await assertCannotDisable('SUPER_ADMIN');
});

test('funções configuradas como obrigatórias também não podem desabilitar MFA', async () => {
  process.env.MFA_REQUIRED_ROLES = 'ADMIN,SUPER_ADMIN';
  await assertCannotDisable('ADMIN');
});
