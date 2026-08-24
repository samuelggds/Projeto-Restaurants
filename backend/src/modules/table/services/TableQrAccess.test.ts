// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import listTableService from './ListTableService.js';
import getTableByIdService from './GetTableByIdService.js';
import createTableService from './CreateTableService.js';
import tableRepository from '../repositories/TableRepository.js';
import ListTableController from '../controllers/ListTableController.js';

const originals = {
  create: tableRepository.create,
  findByNumber: tableRepository.findByNumber,
  findByIdForRestaurant: tableRepository.findByIdForRestaurant,
  findAllByRestaurant: tableRepository.findAllByRestaurant,
  listTables: listTableService.execute,
};

afterEach(() => {
  tableRepository.create = originals.create;
  tableRepository.findByNumber = originals.findByNumber;
  tableRepository.findByIdForRestaurant = originals.findByIdForRestaurant;
  tableRepository.findAllByRestaurant = originals.findAllByRestaurant;
  listTableService.execute = originals.listTables;
});

test('admin cria a mesa já vinculada a um token criptográfico opaco', async () => {
  const created = [];
  tableRepository.findByNumber = async (number, restaurantId) => {
    assert.equal(restaurantId, 7);
    assert.ok(number === 1 || number === 2);
    return null;
  };
  tableRepository.create = async (data) => {
    created.push(data);
    return { id: created.length, active: true, ...data };
  };

  const first = await createTableService.execute({ number: 1, restaurantId: 7 });
  const second = await createTableService.execute({ number: 2, restaurantId: 7 });

  assert.match(first.token, /^[a-f0-9]{32}$/);
  assert.match(second.token, /^[a-f0-9]{32}$/);
  assert.notEqual(first.token, second.token);
  assert.equal(first.restaurantId, 7);
  assert.equal(first.number, 1);
});

test('consulta individual usa id e tenant juntos e só expõe token para admin', async () => {
  const table = {
    id: 91,
    number: 12,
    token: 'a'.repeat(32),
    active: true,
    restaurantId: 7,
  };
  const queries = [];
  tableRepository.findByIdForRestaurant = async (id, restaurantId) => {
    queries.push([Number(id), Number(restaurantId)]);
    return Number(restaurantId) === 7 ? table : null;
  };

  const waiterTable = await getTableByIdService.execute({ id: 91, restaurantId: 7 });
  const adminTable = await getTableByIdService.execute({
    id: 91,
    restaurantId: 7,
    includeQrToken: true,
  });

  assert.equal('token' in waiterTable, false);
  assert.equal(adminTable.token, table.token);
  assert.deepEqual(queries, [
    [91, 7],
    [91, 7],
  ]);
  await assert.rejects(
    () => getTableByIdService.execute({ id: 91, restaurantId: 8, includeQrToken: true }),
    /Mesa não encontrada/i,
  );
});

test('repositório restringe a mesa pelo restaurante na própria consulta', async () => {
  let query;
  const fakeDb = {
    table: {
      findFirst: async (args) => {
        query = args;
        return null;
      },
    },
  };

  await tableRepository.findByIdForRestaurant(91, 7, fakeDb);

  assert.deepEqual(query.where, { id: 91, restaurantId: 7 });
});

test('controller solicita token somente quando o papel autenticado é ADMIN', async () => {
  const calls = [];
  listTableService.execute = async (payload) => {
    calls.push(payload);
    return [];
  };

  const invoke = async (role, subRole = null) => {
    const req = { user: { id: 1, restaurantId: 7, role, subRole } };
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    await ListTableController.handle(req, res);
    return res;
  };

  await invoke(UserRole.ADMIN);
  await invoke(UserRole.FUNCIONARIO, FuncionarioSubRole.GARCOM);

  assert.deepEqual(calls, [
    { restaurantId: 7, includeQrToken: true },
    { restaurantId: 7, includeQrToken: false },
  ]);
});

test('garçom não atravessa o middleware administrativo de mesas', () => {
  let statusCode = 200;
  let responseBody;
  let nextCalled = false;
  const req = {
    user: {
      id: 44,
      restaurantId: 7,
      role: UserRole.FUNCIONARIO,
      subRole: FuncionarioSubRole.GARCOM,
    },
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(payload) {
      responseBody = payload;
      return this;
    },
  };

  adminMiddleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(statusCode, 403);
  assert.match(responseBody.error, /Acesso negado/i);
  assert.equal(nextCalled, false);
});
