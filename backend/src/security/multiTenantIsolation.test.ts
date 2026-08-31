// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@prisma/client';

import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { staffMiddleware } from '../middlewares/staffMiddleware.js';
import employeeRepository from '../modules/employee/repositories/EmployeeRepository.js';
import tableRepository from '../modules/table/repositories/TableRepository.js';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';

function invokeMiddleware(middleware, user) {
  let statusCode = 200;
  let body;
  let nextCalled = false;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
  };

  middleware({ user }, response, () => {
    nextCalled = true;
  });

  return { statusCode, body, nextCalled };
}

test('middlewares privados negam contas sem tenant positivo', () => {
  const identities = [
    undefined,
    { id: 1, role: UserRole.ADMIN, restaurantId: null },
    { id: 1, role: UserRole.ADMIN, restaurantId: 0 },
    { id: 1, role: UserRole.ADMIN, restaurantId: -1 },
  ];

  for (const identity of identities) {
    const adminResult = invokeMiddleware(adminMiddleware, identity);
    assert.equal(adminResult.nextCalled, false);
    assert.ok([401, 403].includes(adminResult.statusCode));

    const staffResult = invokeMiddleware(staffMiddleware, identity);
    assert.equal(staffResult.nextCalled, false);
    assert.ok([401, 403].includes(staffResult.statusCode));
  }
});

test('repositório de mesas inclui restaurantId na própria escrita', async () => {
  const writes = [];
  const fakeDb = {
    table: {
      update: async (args) => {
        writes.push(args);
        return args;
      },
    },
  };

  await tableRepository.update(91, 7, { number: 12 }, fakeDb);
  await tableRepository.deactivate(91, 7, fakeDb);

  assert.deepEqual(writes[0].where, { id: 91, restaurantId: 7 });
  assert.deepEqual(writes[1].where, { id: 91, restaurantId: 7 });
});

test('repositório de funcionários não pode atualizar outra role ou outro tenant', async () => {
  const writes = [];
  const fakeDb = {
    user: {
      findFirst: async ({ where }) => ({
        id: where.id,
        restaurantId: where.restaurantId,
        role: UserRole.FUNCIONARIO,
      }),
      update: async (args) => {
        writes.push(args);
        return args;
      },
    },
  };

  await employeeRepository.update(44, { name: 'Funcionário A' }, 7, fakeDb);
  await employeeRepository.deactivate(44, 7, fakeDb);
  await employeeRepository.reactivate(44, 7, fakeDb);

  for (const write of writes) {
    assert.equal(write.where.id, 44);
    assert.equal(write.where.restaurantId, 7);
    assert.deepEqual(write.where.role.in, [UserRole.FUNCIONARIO, UserRole.MOTOQUEIRO]);
  }
});

test('leituras e fechamentos de sessão de mesa são atomicamente isolados por tenant', async () => {
  const reads = [];
  const writes = [];
  const fakeDb = {
    tableSession: {
      findFirst: async (args) => {
        reads.push(args);
        return null;
      },
      update: async (args) => {
        writes.push(args);
        return args;
      },
    },
  };

  await tableSessionRepository.findActiveByTable(91, 7, fakeDb);
  await tableSessionRepository.findById(55, 7, fakeDb);
  await tableSessionRepository.close(55, 7, 3, fakeDb);
  await tableSessionRepository.forceClose(55, 7, 3, 'auditoria', fakeDb);

  assert.deepEqual(
    reads.map((query) => [query.where.restaurantId, query.where.tableId ?? query.where.id]),
    [
      [7, 91],
      [7, 55],
    ],
  );
  assert.deepEqual(
    writes.map((query) => query.where),
    [
      { id: 55, restaurantId: 7 },
      { id: 55, restaurantId: 7 },
    ],
  );
});
