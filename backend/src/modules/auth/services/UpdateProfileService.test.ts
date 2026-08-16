// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import updateProfileService from './UpdateProfileService.js';
import userRepository from '../repositories/UserRepository.js';

const originalFindById = userRepository.findById;
const originalFindByEmail = userRepository.findByEmail;
const originalUpdateProfile = userRepository.updateProfile;

afterEach(() => {
  userRepository.findById = originalFindById;
  userRepository.findByEmail = originalFindByEmail;
  userRepository.updateProfile = originalUpdateProfile;
});

test('persiste apenas o avatar sem limpar os outros dados do perfil', async () => {
  const existingUser = {
    id: 7,
    email: 'cliente@pizza.com',
    name: 'Cliente',
  };
  let savedUpdate;

  userRepository.findById = async () => existingUser;
  userRepository.findByEmail = async () => null;
  userRepository.updateProfile = async (_id, data) => {
    savedUpdate = data;
    return { ...existingUser, ...data };
  };

  const result = await updateProfileService.execute(7, {
    avatar: 'data:image/jpeg;base64,foto',
  });

  assert.deepEqual(savedUpdate, {
    avatar: 'data:image/jpeg;base64,foto',
  });
  assert.equal(result.avatar, 'data:image/jpeg;base64,foto');
  assert.equal(result.name, 'Cliente');
});

test('normaliza somente os campos enviados na edição do perfil', async () => {
  const existingUser = { id: 8, email: 'cliente@pizza.com' };
  let savedUpdate;

  userRepository.findById = async () => existingUser;
  userRepository.findByEmail = async () => null;
  userRepository.updateProfile = async (_id, data) => {
    savedUpdate = data;
    return data;
  };

  await updateProfileService.execute(8, {
    phone: '(85) 99999-0000',
    cpf: '123.456.789-00',
  });

  assert.deepEqual(savedUpdate, {
    phone: '(85) 99999-0000',
    cpf: '12345678900',
  });
});
