// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import resolvePublicTableService from '../modules/table/services/ResolvePublicTableService.js';
import { createSocketAuth } from './socketAuth.js';
import { socketHandler } from './socketHandler.js';
import { issueGuestOrderOwnershipToken } from '../modules/orders/utils/guestOrderOwnershipToken.js';

const originalResolve = resolvePublicTableService.execute;
const originalGuestSecret = process.env.GUEST_ORDER_OWNERSHIP_SECRET;
const socketAuth = createSocketAuth(async () => undefined);

afterEach(() => {
  resolvePublicTableService.execute = originalResolve;
  if (originalGuestSecret === undefined) delete process.env.GUEST_ORDER_OWNERSHIP_SECRET;
  else process.env.GUEST_ORDER_OWNERSHIP_SECRET = originalGuestSecret;
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


test('autentica visitante somente com comprovantes válidos dos próprios pedidos', async () => {
  process.env.GUEST_ORDER_OWNERSHIP_SECRET = 'test-guest-order-ownership-secret-that-is-long-enough';
  const tokenA = issueGuestOrderOwnershipToken({ orderId: 91, publicId: 'public-91' });
  const tokenB = issueGuestOrderOwnershipToken({ orderId: 92, publicId: 'public-92' });
  const socket = {
    handshake: {
      auth: {
        guestOrderProofs: [
          { orderId: 91, token: tokenA },
          { orderId: 92, token: tokenB },
          { orderId: 93, token: 'invalido' },
        ],
      },
    },
  };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError, undefined);
  assert.equal(socket.authType, 'guest-orders');
  assert.deepEqual(socket.guestOrderIds, [91, 92]);
});

test('rejeita socket visitante quando nenhum comprovante é válido', async () => {
  process.env.GUEST_ORDER_OWNERSHIP_SECRET = 'test-guest-order-ownership-secret-that-is-long-enough';
  const socket = {
    handshake: {
      auth: {
        guestOrderProofs: [{ orderId: 91, token: 'invalido' }],
      },
    },
  };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError?.message, 'Pedidos de visitante inválidos');
  assert.equal(socket.authType, undefined);
});

test('socket visitante entra somente nas salas dos pedidos comprovados', () => {
  const joinedRooms = [];
  const socket = {
    id: 'guest-orders-client',
    authType: 'guest-orders',
    guestOrderIds: [91, 92],
    join: (room) => joinedRooms.push(room),
    on: () => {},
  };

  socketHandler(socket);

  assert.deepEqual(joinedRooms, ['guest-order:91', 'guest-order:92']);
  assert.equal(joinedRooms.includes('restaurant:7'), false);
  assert.equal(joinedRooms.includes('user:91'), false);
});
