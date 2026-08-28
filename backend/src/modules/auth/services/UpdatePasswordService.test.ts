// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import bcrypt from 'bcrypt';

import prisma from '../../../config/prisma.js';
import userRepository from '../repositories/UserRepository.js';
import updatePasswordService from './UpdatePasswordService.js';

const originalTransaction = prisma.$transaction;
const originalFindByIdWithPassword = userRepository.findByIdWithPassword;
const originalUpdatePassword = userRepository.updatePassword;

afterEach(() => {
  prisma.$transaction = originalTransaction;
  userRepository.findByIdWithPassword = originalFindByIdWithPassword;
  userRepository.updatePassword = originalUpdatePassword;
});

async function installUser(overrides = {}) {
  const currentPassword = 'Chave-Atual-Forte-42!';
  const password = await bcrypt.hash(currentPassword, 4);
  userRepository.findByIdWithPassword = async () => ({
    id: 17,
    password,
    role: 'ADMIN',
    mustChangePassword: true,
    ...overrides,
  });
  return currentPassword;
}

test('conta em troca obrigatória rejeita nova senha fraca', async () => {
  const currentPassword = await installUser();
  let updated = false;
  userRepository.updatePassword = async () => {
    updated = true;
  };

  await assert.rejects(
    () => updatePasswordService.execute(17, currentPassword, 'Senha123!'),
    /previsível/,
  );
  assert.equal(updated, false);
});

test('SUPER_ADMIN sempre precisa usar todas as classes, mesmo após o primeiro acesso', async () => {
  const currentPassword = await installUser({
    role: 'SUPER_ADMIN',
    mustChangePassword: false,
  });

  await assert.rejects(
    () => updatePasswordService.execute(17, currentPassword, 'Curta123'),
    /símbolo/u,
  );
});

test('conta comum também precisa usar maiúscula, minúscula, número e símbolo', async () => {
  const currentPassword = await installUser({
    role: 'CLIENTE',
    mustChangePassword: false,
  });

  await assert.rejects(
    () => updatePasswordService.execute(17, currentPassword, 'sem-maiuscula1!'),
    /maiúscula/u,
  );
});

test('troca obrigatória aceita senha forte com oito caracteres, revoga refresh e persiste hash', async () => {
  const currentPassword = await installUser();
  let persistedHash = '';
  let refreshSessionsRevoked = false;
  userRepository.updatePassword = async (_id, hash) => {
    persistedHash = hash;
    return { id: 17, mustChangePassword: false };
  };
  prisma.$transaction = async (callback) =>
    callback({
      authRefreshSession: {
        deleteMany: async () => {
          refreshSessionsRevoked = true;
          return { count: 1 };
        },
      },
    });

  const newPassword = 'Segura1!';
  const result = await updatePasswordService.execute(17, currentPassword, newPassword);

  assert.equal(result.mustChangePassword, false);
  assert.equal(refreshSessionsRevoked, true);
  assert.equal(await bcrypt.compare(newPassword, persistedHash), true);
  assert.equal(bcrypt.getRounds(persistedHash), 12);
});

test('não permite reutilizar a senha atual', async () => {
  const currentPassword = await installUser();

  await assert.rejects(
    () => updatePasswordService.execute(17, currentPassword, currentPassword),
    /diferente da senha atual/,
  );
});
