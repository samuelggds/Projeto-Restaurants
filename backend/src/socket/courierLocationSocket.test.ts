// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import prisma from '../config/prisma.js';
import { socketHandler } from './socketHandler.js';
import { socketAuth } from './socketAuth.js';
import jwt from 'jsonwebtoken';

const originals = {
  findUnique: prisma.order.findUnique,
  createLocation: prisma.deliveryLocation.create,
  findUser: prisma.user.findFirst,
  transaction: prisma.$transaction,
  jwtSecret: process.env.JWT_SECRET,
};

beforeEach(() => {
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [{ id: 91 }],
      deliveryLocation: {
        create: (args) => prisma.deliveryLocation.create(args),
      },
    });
});

afterEach(() => {
  prisma.order.findUnique = originals.findUnique;
  prisma.deliveryLocation.create = originals.createLocation;
  prisma.user.findFirst = originals.findUser;
  prisma.$transaction = originals.transaction;
  process.env.JWT_SECRET = originals.jwtSecret;
});

function createSocket(user = { id: 31, role: 'MOTOQUEIRO', restaurantId: 7 }) {
  const listeners = new Map();
  const rooms = [];
  const emissions = [];
  return {
    id: 'courier-socket',
    authType: 'user',
    user,
    listeners,
    rooms,
    emissions,
    join(room) {
      rooms.push(room);
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
    to(room) {
      return {
        emit(event, payload) {
          emissions.push({ room, event, payload });
        },
      };
    },
    disconnect() {},
  };
}

function trackedOrder(overrides = {}) {
  return {
    id: 91,
    userId: 12,
    restaurantId: 7,
    type: 'DELIVERY',
    status: 'SAIU_PARA_ENTREGA',
    assignedCourierId: 31,
    assignedCourier: {
      id: 31,
      restaurantId: 7,
      role: 'MOTOQUEIRO',
      active: true,
    },
    ...overrides,
  };
}

async function sendLocation(socket, orderId = 91) {
  let response;
  await socket.listeners.get('delivery:location:update')(
    {
      orderId,
      latitude: -3.7319,
      longitude: -38.5267,
      heading: 180,
      speed: 8,
      accuracy: 12,
      sentAt: new Date().toISOString(),
    },
    (ack) => {
      response = ack;
    },
  );
  return response;
}

test('persiste GPS da conta atribuída e emite somente ao cliente e admin do tenant', async () => {
  let persisted;
  prisma.order.findUnique = async () => trackedOrder();
  prisma.deliveryLocation.create = async ({ data }) => {
    persisted = data;
    return { recordedAt: data.recordedAt };
  };
  const socket = createSocket();
  socketHandler(socket);

  assert.deepEqual(await sendLocation(socket), { ok: true });
  assert.equal(persisted.orderId, 91);
  assert.equal(persisted.courierId, 31);
  assert.equal(socket.emissions[0].payload.restaurantId, 7);
  assert.deepEqual(
    socket.emissions.map(({ room, event }) => ({ room, event })),
    [
      { room: 'user:12', event: 'order:delivery-location' },
      { room: 'restaurant:7:admin', event: 'order:delivery-location' },
    ],
  );
  assert.equal(
    socket.emissions.some(({ room }) => room === 'restaurant:7'),
    false,
  );
  assert.equal(socket.rooms.includes('courier'), false);
  assert.equal(socket.rooms.includes('restaurant:7:courier'), true);
});

test('handshake do motoqueiro confirma conta ativa e tenant no banco', async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  const token = jwt.sign({ id: 31, role: 'MOTOQUEIRO', restaurantId: 7 }, process.env.JWT_SECRET);
  let query;
  prisma.user.findFirst = async (args) => {
    query = args;
    return { id: 31, role: 'MOTOQUEIRO', restaurantId: 7 };
  };
  const socket = { handshake: { auth: { token } } };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError, undefined);
  assert.equal(socket.user.id, 31);
  assert.deepEqual(query.where, {
    id: 31,
    restaurantId: 7,
    role: 'MOTOQUEIRO',
    active: true,
  });

  prisma.user.findFirst = async () => null;
  const staleSocket = { handshake: { auth: { token } } };
  let staleError;
  await socketAuth(staleSocket, (error) => {
    staleError = error;
  });
  assert.match(staleError?.message || '', /inativa ou fora do restaurante/);
});

test('handshake do admin confirma conta ativa e tenant antes de liberar a sala privada', async () => {
  process.env.JWT_SECRET = 'test_jwt_secret_with_minimum_32_chars_123456';
  const token = jwt.sign({ id: 9, role: 'ADMIN', restaurantId: 7 }, process.env.JWT_SECRET);
  let query;
  prisma.user.findFirst = async (args) => {
    query = args;
    return { id: 9, role: 'ADMIN', restaurantId: 7 };
  };
  const socket = { handshake: { auth: { token } } };
  let authError;

  await socketAuth(socket, (error) => {
    authError = error;
  });

  assert.equal(authError, undefined);
  assert.deepEqual(query.where, {
    id: 9,
    restaurantId: 7,
    role: 'ADMIN',
    active: true,
  });
  assert.deepEqual(socket.user, {
    ...socket.user,
    id: 9,
    role: 'ADMIN',
    restaurantId: 7,
  });

  prisma.user.findFirst = async () => null;
  const staleSocket = { handshake: { auth: { token } } };
  let staleError;
  await socketAuth(staleSocket, (error) => {
    staleError = error;
  });
  assert.match(staleError?.message || '', /administrador inativa ou fora do restaurante/);
  assert.equal(staleSocket.user, undefined);
});

test('não vaza nem persiste localização de outro courier, tenant, cliente ou pedido encerrado', async () => {
  let createCalls = 0;
  prisma.deliveryLocation.create = async () => {
    createCalls += 1;
    return { recordedAt: new Date() };
  };

  for (const order of [
    trackedOrder({
      assignedCourierId: 32,
      assignedCourier: { id: 32, restaurantId: 7, role: 'MOTOQUEIRO', active: true },
    }),
    trackedOrder({ restaurantId: 8 }),
    trackedOrder({ status: 'ENTREGUE' }),
    trackedOrder({
      assignedCourier: { id: 31, restaurantId: 7, role: 'MOTOQUEIRO', active: false },
    }),
  ]) {
    prisma.order.findUnique = async () => order;
    const socket = createSocket();
    socketHandler(socket);
    const response = await sendLocation(socket);
    assert.equal(response.ok, false);
    assert.equal(socket.emissions.length, 0);
  }

  assert.equal(createCalls, 0);
});

test('revalidação transacional bloqueia GPS quando a entrega encerra após a leitura inicial', async () => {
  let createCalls = 0;
  prisma.order.findUnique = async () => trackedOrder();
  prisma.deliveryLocation.create = async () => {
    createCalls += 1;
    return { recordedAt: new Date() };
  };
  prisma.$transaction = async (callback) =>
    callback({
      // Simula o pedido já ENTREGUE quando a linha é bloqueada dentro da transação.
      $queryRaw: async () => [],
      deliveryLocation: {
        create: (args) => prisma.deliveryLocation.create(args),
      },
    });
  const socket = createSocket();
  socketHandler(socket);

  assert.deepEqual(await sendLocation(socket), {
    ok: false,
    error: 'A entrega foi encerrada ou não está mais atribuída à sua conta.',
  });
  assert.equal(createCalls, 0);
  assert.equal(socket.emissions.length, 0);
});

test('limita cada pedido separadamente sem suprimir uma segunda entrega', async () => {
  let createCalls = 0;
  prisma.order.findUnique = async ({ where }) => trackedOrder({ id: where.id });
  prisma.deliveryLocation.create = async ({ data }) => {
    createCalls += 1;
    return { recordedAt: data.recordedAt };
  };
  const socket = createSocket();
  socketHandler(socket);

  assert.deepEqual(await sendLocation(socket, 91), { ok: true });
  assert.deepEqual(await sendLocation(socket, 92), { ok: true });
  assert.deepEqual(await sendLocation(socket, 91), { ok: true, throttled: true });
  assert.equal(createCalls, 2);
});

test('falha de persistência retorna ack amigável e não gera rejeição não tratada', async () => {
  prisma.order.findUnique = async () => trackedOrder();
  prisma.deliveryLocation.create = async () => {
    throw new Error('database secret detail');
  };
  const socket = createSocket();
  socketHandler(socket);

  const response = await sendLocation(socket);
  assert.deepEqual(response, {
    ok: false,
    error: 'Não foi possível atualizar a localização agora. Tente novamente.',
  });
  assert.equal(socket.emissions.length, 0);
});

test('payload malformado também recebe ack seguro sem exceção não tratada', async () => {
  const socket = createSocket();
  socketHandler(socket);
  let response;
  const malformedPayload = Object.defineProperty({}, 'orderId', {
    get() {
      throw new Error('malformed secret detail');
    },
  });

  await socket.listeners.get('delivery:location:update')(malformedPayload, (ack) => {
    response = ack;
  });

  assert.deepEqual(response, {
    ok: false,
    error: 'Não foi possível atualizar a localização agora. Tente novamente.',
  });
  assert.equal(socket.emissions.length, 0);
});
