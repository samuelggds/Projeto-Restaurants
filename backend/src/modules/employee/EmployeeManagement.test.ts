// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../config/prisma.js';
import { EmployeeUserSchema, UpdateEmployeeSchema } from '../../validators/EmployeeSchema.js';
import employeeRepository from './repositories/EmployeeRepository.js';
import updateEmployeeService from './services/UpdateEmployeeService.js';
import deactivateEmployeeService from './services/DeactivateEmployeeService.js';

const originalUserFindMany = prisma.user.findMany;
const originalTransaction = prisma.$transaction;
const originalRepositoryMethods = {
  findById: employeeRepository.findById,
  findByEmail: employeeRepository.findByEmail,
  update: employeeRepository.update,
  deactivate: employeeRepository.deactivate,
};

afterEach(() => {
  prisma.user.findMany = originalUserFindMany;
  prisma.$transaction = originalTransaction;
  Object.assign(employeeRepository, originalRepositoryMethods);
});

test('valida e normaliza os dados obrigatórios na criação do funcionário', () => {
  const parsed = EmployeeUserSchema.parse({
    name: '  Ana Souza  ',
    email: '  ANA@EXEMPLO.COM  ',
    phone: '(85) 99999-9999',
    password: 'segura123',
    confirmPassword: 'segura123',
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
  });

  assert.equal(parsed.name, 'Ana Souza');
  assert.equal(parsed.email, 'ana@exemplo.com');
  assert.equal(parsed.phone, '(85) 99999-9999');
});

test('rejeita criação sem telefone e senhas divergentes', () => {
  assert.throws(
    () =>
      EmployeeUserSchema.parse({
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        password: 'segura123',
        confirmPassword: 'outra123',
        role: 'FUNCIONARIO',
      }),
    /Telefone obrigatório|As senhas não conferem/,
  );
});

test('valida atualização parcial e rejeita e-mail inválido', () => {
  assert.deepEqual(UpdateEmployeeSchema.parse({ name: '  Ana Lima  ' }), { name: 'Ana Lima' });
  assert.throws(() => UpdateEmployeeSchema.parse({ email: 'email-inválido' }), /Email inválido/);
  assert.throws(() => UpdateEmployeeSchema.parse({}), /Informe ao menos um dado/);
});

test('a listagem solicita apenas campos públicos e nunca o hash de senha', async () => {
  let capturedArgs;
  prisma.user.findMany = async (args) => {
    capturedArgs = args;
    return [];
  };

  await employeeRepository.findAllByRestaurant(17);

  assert.equal(capturedArgs.where.restaurantId, 17);
  assert.equal(capturedArgs.select.password, undefined);
  assert.equal(capturedArgs.select.resetPasswordCodeHash, undefined);
  assert.equal(capturedArgs.select.name, true);
  assert.equal(capturedArgs.select.subRole, true);
});

test('impede atualização de funcionário pertencente a outro restaurante', async () => {
  let updateCalled = false;
  employeeRepository.findById = async (_id, restaurantId) => {
    assert.equal(restaurantId, 22);
    return null;
  };
  employeeRepository.update = async () => {
    updateCalled = true;
  };

  await assert.rejects(
    () =>
      updateEmployeeService.execute({
        id: 9,
        restaurantId: 22,
        name: 'Outro restaurante',
        email: 'outro@exemplo.com',
      }),
    /Funcionário não encontrado/,
  );
  assert.equal(updateCalled, false);
});

test('atualização parcial preserva cargo e telefone quando não foram enviados', async () => {
  let capturedData;
  employeeRepository.findById = async () => ({
    id: 9,
    restaurantId: 22,
    active: true,
    subRole: 'COZINHA',
  });
  employeeRepository.update = async (_id, data) => {
    capturedData = data;
    return { id: 9, ...data };
  };

  await updateEmployeeService.execute({ id: 9, restaurantId: 22, name: 'Ana Lima' });

  assert.deepEqual(capturedData, { name: 'Ana Lima' });
});

test('permite mover um acesso para motoqueiro e remove o subcargo incompatível', async () => {
  let capturedData;
  employeeRepository.findById = async () => ({
    id: 9,
    restaurantId: 22,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
  });
  employeeRepository.update = async (_id, data) => {
    capturedData = data;
    return { id: 9, ...data };
  };

  await updateEmployeeService.execute({
    id: 9,
    restaurantId: 22,
    role: 'MOTOQUEIRO',
    subRole: 'GARCOM',
  });

  assert.deepEqual(capturedData, {
    role: 'MOTOQUEIRO',
    subRole: null,
    authVersion: { increment: 1 },
  });
});

test('desativação revoga a sessão renovável do funcionário no mesmo tenant', async () => {
  let deletedUserId = 0;
  const transaction = {
    authRefreshSession: {
      deleteMany: async ({ where }) => {
        deletedUserId = where.userId;
        return { count: 1 };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  employeeRepository.findById = async (_id, restaurantId, db) => {
    assert.equal(restaurantId, 17);
    assert.equal(db, transaction);
    return { id: 81, restaurantId: 17, active: true };
  };
  employeeRepository.deactivate = async (_id, restaurantId, db) => {
    assert.equal(restaurantId, 17);
    assert.equal(db, transaction);
    return { id: 81, restaurantId: 17, active: false };
  };

  const result = await deactivateEmployeeService.execute(81, 17);

  assert.equal(result.active, false);
  assert.equal(deletedUserId, 81);
});
