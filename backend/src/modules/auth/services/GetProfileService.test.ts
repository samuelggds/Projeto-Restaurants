// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import userRepository from '../repositories/UserRepository.js';
import getProfileService from './GetProfileService.js';

const originalFindById = userRepository.findById;
const originalRequiredRoles = process.env.MFA_REQUIRED_ROLES;

afterEach(() => {
  userRepository.findById = originalFindById;
  if (originalRequiredRoles === undefined) {
    delete process.env.MFA_REQUIRED_ROLES;
  } else {
    process.env.MFA_REQUIRED_ROLES = originalRequiredRoles;
  }
});

test('perfil expõe MFA efetivo para ADMIN com role obrigatória', async () => {
  process.env.MFA_REQUIRED_ROLES = 'ADMIN,SUPER_ADMIN';
  userRepository.findById = async () => ({
    id: 1,
    role: 'ADMIN',
    mfaEnabled: false,
  });

  const profile = await getProfileService.execute(1);
  assert.equal(profile.mfaEnabled, true);
});

test('perfil preserva MFA opcional desativado para CLIENTE', async () => {
  process.env.MFA_REQUIRED_ROLES = 'ADMIN,SUPER_ADMIN';
  userRepository.findById = async () => ({
    id: 2,
    role: 'CLIENTE',
    mfaEnabled: false,
  });

  const profile = await getProfileService.execute(2);
  assert.equal(profile.mfaEnabled, false);
});
