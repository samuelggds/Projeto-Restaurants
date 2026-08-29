// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import resolvePublicTableService from '../modules/table/services/ResolvePublicTableService.js';
import { createSocketAuth } from './socketAuth.js';
import { socketHandler } from './socketHandler.js';

const originalResolve = resolvePublicTableService.execute;
const socketAuth = createSocketAuth(async () => undefined);

afterEach(() => {
  resolvePublicTableService.execute = originalResolve;
});

test('autentica a espera pública somente após validar o QR da mesa', async () => {
  let receivedPayload = null;
  resolvePublicTableService.execute = async (payload) => {
    receivedPayload = payload;
    return {
      id: 22,
      number: 1,
      restaurantId: 3,
      restaurantSlug: 'restaurante-demo',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    };
  };
  const socket = {
    handshake: {
      auth: {
        tableToken: 'a'.repeat(32),
        tableNumber: 1,
        restaurantId: 3,
      },
    },
  };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError, undefined);
  assert.deepEqual(receivedPayload, {
    tableNumber: 1,
    tableToken: 'a'.repeat(32),
    restaurantId: 3,
    restaurantSlug: undefined,
  });
  assert.equal(socket.authType, 'table-waiting');
  assert.deepEqual(socket.waitingTable, { id: 22, number: 1, restaurantId: 3 });
});

test('isola o cliente aguardando na sala da mesa validada', () => {
  const joinedRooms = [];
  const socket = {
    id: 'waiting-client',
    authType: 'table-waiting',
    waitingTable: { id: 22, number: 1, restaurantId: 3 },
    join: (room) => joinedRooms.push(room),
    on: () => {},
  };

  socketHandler(socket);

  assert.deepEqual(joinedRooms, ['table-waiting:22']);
});
