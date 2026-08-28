// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import deactivateUserService from './DeactivateUserService.js';

const originalTransaction = prisma.$transaction;
const originalFindById = userRepository.findById;
const originalDeactivate = userRepository.deactivate;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  userRepository.findById = originalFindById;
  userRepository.deactivate = originalDeactivate;
});

test('não permite desativar a única conta SUPER_ADMIN', async () => {
  let deactivated = false;
  userRepository.findById = async () => ({ id: 1, role: 'SUPER_ADMIN' });
  userRepository.deactivate = async () => {
    deactivated = true;
  };
  prisma.$transaction = async (callback) => callback({});

  await assert.rejects(
    () => deactivateUserService.execute(1),
    /SUPER_ADMIN não pode ser desativada/u,
  );
  assert.equal(deactivated, false);
});
