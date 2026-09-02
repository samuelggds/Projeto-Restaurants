// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../config/prisma.js';
import { EmployeeUserSchema, UpdateEmployeeSchema } from '../../validators/EmployeeSchema.js';
import employeeRepository from './repositories/EmployeeRepository.js';
import createEmployeeService from './services/CreateEmployeeService.js';
import updateEmployeeService from './services/UpdateEmployeeService.js';
import deactivateEmployeeService from './services/DeactivateEmployeeService.js';

const adminActor = { userId: 4, role: 'ADMIN' };

const originalUserFindMany = prisma.user.findMany;
const originalTransaction = prisma.$transaction;
const originalRepositoryMethods = {
  findById: employeeRepository.findById,
  findByEmail: employeeRepository.findByEmail,
  create: employeeRepository.create,
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
    password: 'Segura123!',
    confirmPassword: 'Segura123!',
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
        password: 'Segura123!',
        confirmPassword: 'Outra123!',
        role: 'FUNCIONARIO',
      }),
    /Telefone obrigatório|As senhas não conferem/,
  );
});

test('canonicaliza funcionário legado sem subcargo como atendente', async () => {
  let capturedData;
  employeeRepository.findByEmail = async () => null;
  employeeRepository.create = async (data) => {
    capturedData = data;
    return { id: 91, ...data };
  };

  await createEmployeeService.execute({
    name: 'Ana Atendimento',
    email: 'ana.atendimento@example.com',
    password: 'Segura123!',
    phone: '(85) 99999-9999',
    restaurantId: 17,
    role: 'FUNCIONARIO',
  });

  assert.equal(capturedData.role, 'FUNCIONARIO');
  assert.equal(capturedData.subRole, 'ATENDENTE');
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
        actor: adminActor,
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

  await updateEmployeeService.execute({
    id: 9,
    restaurantId: 22,
    name: 'Ana Lima',
    actor: adminActor,
  });

  assert.deepEqual(capturedData, { name: 'Ana Lima' });
});

test('permite mover um acesso para motoqueiro e remove o subcargo incompatível', async () => {
  let capturedData;
  const transaction = {
    $queryRaw: async () => [],
    tableWaiterAssignment: { findFirst: async () => null },
    employeeCompensationPolicy: { findFirst: async () => null },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  employeeRepository.findById = async () => ({
    id: 9,
    restaurantId: 22,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
  });
  employeeRepository.update = async (_id, data, _restaurantId, db) => {
    assert.equal(db, transaction);
    capturedData = data;
    return { id: 9, ...data };
  };

  await updateEmployeeService.execute({
    id: 9,
    restaurantId: 22,
    role: 'MOTOQUEIRO',
    subRole: 'GARCOM',
    actor: adminActor,
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
    $queryRaw: async () => [],
    employeeCompensationPolicy: { findFirst: async () => null },
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
    return {
      id: 81,
      restaurantId: 17,
      role: 'FUNCIONARIO',
      subRole: 'COZINHA',
      active: true,
    };
  };
  employeeRepository.deactivate = async (_id, restaurantId, db) => {
    assert.equal(restaurantId, 17);
    assert.equal(db, transaction);
    return { id: 81, restaurantId: 17, active: false };
  };

  const result = await deactivateEmployeeService.execute(81, 17, adminActor);

  assert.equal(result.active, false);
  assert.equal(deletedUserId, 81);
});

test('exige transferência antes de retirar o subcargo de um garçom responsável', async () => {
  let updateCalled = false;
  const transaction = {
    $queryRaw: async () => [],
    tableWaiterAssignment: {
      findFirst: async ({ where }) => {
        assert.equal(where.restaurantId, 22);
        assert.equal(where.waiterId, 9);
        assert.deepEqual(where.tableSession.status.in, ['OPEN', 'CLOSING_REQUESTED']);
        return { tableSession: { publicId: 'mesa-sessao-aberta' } };
      },
    },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  employeeRepository.findById = async () => ({
    id: 9,
    restaurantId: 22,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
  });
  employeeRepository.update = async () => {
    updateCalled = true;
  };

  await assert.rejects(
    () =>
      updateEmployeeService.execute({
        id: 9,
        restaurantId: 22,
        subRole: 'COZINHA',
        actor: adminActor,
      }),
    /Transfira a mesa mesa-sessao-aberta/i,
  );
  assert.equal(updateCalled, false);
});

test('preserva a remuneração base e remove a variável ao sair de GARCOM', async () => {
  let replacementData;
  let closedData;
  let auditData;
  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  const transaction = {
    $queryRaw: async () => [],
    tableWaiterAssignment: { findFirst: async () => null },
    employeeCompensationPolicy: {
      findFirst: async () => ({
        id: 31,
        publicId: 'policy-v1',
        employeeId: 9,
        baseModel: 'FIXED_MONTHLY',
        fixedMonthlyCents: 250000n,
        hourlyRateCents: null,
        variableModel: 'TABLE_SALES_PERCENTAGE',
        variableBasisPoints: 500,
        fixedPerTableCents: null,
        prorationMode: 'CALENDAR_DAYS',
        effectiveFrom,
        effectiveUntil: null,
        version: 1,
        active: true,
      }),
      updateMany: async ({ data }) => {
        closedData = data;
        return { count: 1 };
      },
      create: async ({ data }) => {
        replacementData = data;
        return { publicId: 'policy-v2', ...data };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        auditData = data;
        return data;
      },
    },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  employeeRepository.findById = async () => ({
    id: 9,
    restaurantId: 22,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
  });
  employeeRepository.update = async (_id, data, _restaurantId, db) => {
    assert.equal(db, transaction);
    return { id: 9, ...data };
  };

  await updateEmployeeService.execute({
    id: 9,
    restaurantId: 22,
    subRole: 'COZINHA',
    actor: adminActor,
  });

  assert.equal(closedData.active, false);
  assert.equal(replacementData.baseModel, 'FIXED_MONTHLY');
  assert.equal(replacementData.fixedMonthlyCents, 250000n);
  assert.equal(replacementData.variableModel, 'NONE');
  assert.equal(replacementData.variableBasisPoints, null);
  assert.equal(replacementData.version, 2);
  assert.equal(replacementData.createdById, 4);
  assert.equal(auditData.metadata.replacementPolicyPublicId, 'policy-v2');
});

test('impede desativar garçom enquanto ele responde por mesa aberta', async () => {
  let deactivateCalled = false;
  const transaction = {
    $queryRaw: async () => [],
    tableWaiterAssignment: {
      findFirst: async () => ({ tableSession: { publicId: 'mesa-em-atendimento' } }),
    },
    authRefreshSession: { deleteMany: async () => ({ count: 0 }) },
  };
  prisma.$transaction = async (callback) => callback(transaction);
  employeeRepository.findById = async () => ({
    id: 81,
    restaurantId: 17,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
    active: true,
  });
  employeeRepository.deactivate = async () => {
    deactivateCalled = true;
  };

  await assert.rejects(
    () => deactivateEmployeeService.execute(81, 17, adminActor),
    /Transfira a mesa mesa-em-atendimento/i,
  );
  assert.equal(deactivateCalled, false);
});
