// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import jwt from 'jsonwebtoken';
import { createSocketAuth } from './socketAuth.js';
import { socketHandler } from './socketHandler.js';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import prisma from '../config/prisma.js';

const originalJwtSecret = process.env.JWT_SECRET;
const originalFindBySessionToken = tableSessionRepository.findBySessionToken;
const originalFindUser = prisma.user.findUnique;
const socketAuth = createSocketAuth(async () => undefined);

afterEach(() => {
  process.env.JWT_SECRET = originalJwtSecret;
  tableSessionRepository.findBySessionToken = originalFindBySessionToken;
  prisma.user.findUnique = originalFindUser;
});

function socketStub(user) {
  const rooms = [];
  const listeners = new Map();
  return {
    id: 'socket-test',
    authType: 'user',
    user,
    rooms,
    join(room) {
      rooms.push(room);
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
    disconnect() {},
  };
}

test('token do cozinheiro mantém subperfil e tenant no handshake', async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  const token = jwt.sign(
    {
      id: 44,
      role: 'FUNCIONARIO',
      subRole: 'COZINHA',
      restaurantId: 7,
      authVersion: 0,
      type: 'access',
    },
    process.env.JWT_SECRET,
  );
  prisma.user.findUnique = async () => ({
    id: 44,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 7,
    email: 'kitchen@example.test',
    authVersion: 0,
  });
  const socket = { handshake: { auth: { token } } };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError, undefined);
  assert.equal(socket.authType, 'user');
  assert.equal(socket.user.subRole, 'COZINHA');
  assert.equal(socket.user.restaurantId, 7);
});

test('cozinha entra somente nas salas realtime do próprio restaurante', () => {
  const socket = socketStub({
    id: 44,
    role: 'FUNCIONARIO',
    subRole: 'COZINHA',
    restaurantId: 7,
  });

  socketHandler(socket);

  assert.deepEqual(
    new Set(socket.rooms),
    new Set(['user:44', 'restaurant:7', 'restaurant:7:kitchen']),
  );
  assert.equal(socket.rooms.includes('kitchen'), false);
  assert.equal(socket.rooms.includes('restaurant:8'), false);
  assert.equal(socket.rooms.includes('restaurant:7:waiter'), false);
});

test('funcionário sem subperfil não entra na sala operacional do restaurante', () => {
  const socket = socketStub({
    id: 45,
    role: 'FUNCIONARIO',
    subRole: null,
    restaurantId: 7,
  });

  socketHandler(socket);

  assert.deepEqual(socket.rooms, ['user:45']);
});

test('garçom entra apenas na room específica do salão do próprio tenant', () => {
  const socket = socketStub({
    id: 46,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
    restaurantId: 7,
  });

  socketHandler(socket);

  assert.deepEqual(socket.rooms, ['user:46', 'restaurant:7:waiter']);
  assert.equal(socket.rooms.includes('restaurant:7'), false);
});

test('admin entra somente nas rooms do próprio tenant e nunca em sala global', () => {
  const socket = socketStub({
    id: 47,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 7,
  });

  socketHandler(socket);

  assert.deepEqual(socket.rooms, [
    'user:47',
    'restaurant:7',
    'restaurant:7:admin',
  ]);
  assert.equal(socket.rooms.includes('admin'), false);
  assert.equal(socket.rooms.includes('restaurant:8'), false);
  assert.equal(socket.rooms.includes('restaurant:8:admin'), false);
});

test('sessão de mesa entra apenas nas rooms da mesa e da própria sessão', () => {
  const socket = socketStub(undefined);
  socket.authType = 'table-session';
  socket.tableSession = { id: 55, tableId: 91, restaurantId: 7 };

  socketHandler(socket);

  assert.deepEqual(socket.rooms, ['table:91', 'table-session:55']);
  assert.equal(socket.rooms.includes('restaurant:7'), false);
});

for (const status of ['OPEN', 'CLOSING_REQUESTED']) {
  test(`socket mantém a conta da mesa conectada no status ${status}`, async () => {
    tableSessionRepository.findBySessionToken = async () => ({
      id: 55,
      tableId: 91,
      status,
      expiresAt: new Date(Date.now() + 60_000),
      table: { number: 12, restaurantId: 7 },
    });
    const socket = { handshake: { auth: { sessionToken: 'sessao-segura' } } };
    let authError;

    await socketAuth(socket, (error) => {
      authError = error;
    });

    assert.equal(authError, undefined);
    assert.equal(socket.authType, 'table-session');
    assert.deepEqual(socket.tableSession, {
      id: 55,
      tableId: 91,
      tableNumber: 12,
      restaurantId: 7,
    });
  });
}

test('socket rejeita sessão da mesa encerrada', async () => {
  tableSessionRepository.findBySessionToken = async () => ({
    id: 55,
    tableId: 91,
    status: 'CLOSED',
    expiresAt: new Date(Date.now() + 60_000),
    table: { number: 12, restaurantId: 7 },
  });
  const socket = { handshake: { auth: { sessionToken: 'sessao-encerrada' } } };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError?.message, 'Sessão da mesa inválida');
  assert.equal(socket.authType, undefined);
});
