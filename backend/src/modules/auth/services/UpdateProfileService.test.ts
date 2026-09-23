// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import updateProfileService from './UpdateProfileService.js';
import userRepository from '../repositories/UserRepository.js';
import prisma from '../../../config/prisma.js';

const originalFindById = userRepository.findById;
const originalFindByEmail = userRepository.findByEmail;
const originalUpdateProfile = userRepository.updateProfile;
const originalFindByIdWithPassword = userRepository.findByIdWithPassword;
const originalTransaction = prisma.$transaction;

afterEach(() => {
  userRepository.findById = originalFindById;
  userRepository.findByEmail = originalFindByEmail;
  userRepository.updateProfile = originalUpdateProfile;
  userRepository.findByIdWithPassword = originalFindByIdWithPassword;
  prisma.$transaction = originalTransaction;
});

function installTransactionStub() {
  prisma.$transaction = async (callback) =>
    callback({
      authRefreshSession: { deleteMany: async () => ({ count: 0 }) },
      emailVerificationToken: { deleteMany: async () => ({ count: 0 }) },
      phoneVerificationChallenge: { deleteMany: async () => ({ count: 0 }) },
    });
}

test('persiste apenas o avatar sem limpar os outros dados do perfil', async () => {
  installTransactionStub();
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
  installTransactionStub();
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
    phoneVerifiedAt: null,
    cpf: '12345678900',
  });
});

test('não permite alterar o email fixo do SUPER_ADMIN pelo perfil genérico', async () => {
  installTransactionStub();
  let updated = false;
  userRepository.findById = async () => ({
    id: 1,
    role: 'SUPER_ADMIN',
    email: 'developer@example.com',
  });
  userRepository.updateProfile = async () => {
    updated = true;
  };

  await assert.rejects(
    () => updateProfileService.execute(1, { email: 'attacker@example.com' }),
    /e-mail da conta SUPER_ADMIN não pode ser alterado/u,
  );
  assert.equal(updated, false);
});


test('exige a senha atual antes de trocar o e-mail de cliente', async () => {
  installTransactionStub();
  let updated = false;
  userRepository.findById = async () => ({
    id: 9,
    role: 'CLIENTE',
    email: 'cliente@example.com',
    restaurantId: null,
  });
  userRepository.findByEmail = async () => null;
  userRepository.findByIdWithPassword = async () => ({
    id: 9,
    password: '$2b$10$hash-invalido-para-qualquer-senha',
  });
  userRepository.updateProfile = async () => {
    updated = true;
  };

  await assert.rejects(
    () => updateProfileService.execute(9, { email: 'novo@example.com' }),
    /Confirme sua senha atual para alterar o e-mail/u,
  );
  assert.equal(updated, false);
});
