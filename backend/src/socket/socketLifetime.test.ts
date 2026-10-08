// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import net from 'node:net';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import { tableSessionEvents } from '../modules/tableSession/realtime/tableSessionEvents.js';
import { tableServiceCallEvents } from '../modules/waiterCalls/realtime/tableServiceCallEvents.js';
import { tableParticipantStateEvents } from '../modules/tableSession/realtime/tableParticipantStateEvents.js';
import { emitTableSessionOrderEvent } from '../modules/orders/utils/waiterOrderRealtime.js';
import { createSocketAuth } from './socketAuth.js';
import { socketHandler } from './socketHandler.js';
import { createSocketIoRealtimeTransport } from '../realtime/socketIoRealtimeTransport.js';
import { registerRealtimeTransport, realtimePublisher } from '../realtime/realtimePublisher.js';
import { platformMaintenanceAccessService } from '../modules/platform/services/PlatformMaintenanceService.js';
import restaurantAccessService from '../modules/billing/services/RestaurantAccessService.js';
import logoutService from '../modules/auth/services/LogoutService.js';
import { resolveAccessToken } from '../modules/auth/security/accessToken.js';

function fixture(t) {
  const restores = [];
  const stub = (target, key, replacement) => {
    const old = target[key];
    target[key] = replacement;
    restores.push(() => {
      target[key] = old;
    });
  };
  const sockets = [];
  t.after(() => {
    for (const socket of sockets) socket.disconnect();
    for (const restore of restores.reverse()) restore();
  });
  const denyIo = () => {
    throw new Error('Unexpected database/network IO');
  };
  stub(prisma, '_request', denyIo);
  stub(prisma, '$connect', denyIo);
  stub(net.Socket.prototype, 'connect', denyIo);
  stub(globalThis, 'fetch', denyIo);
  stub(process.env, 'JWT_SECRET', 'socket_lifetime_access_synthetic_test_key');
  stub(process.env, 'JWT_REFRESH_SECRET', 'socket_lifetime_refresh_synthetic_test_key');
  stub(platformMaintenanceAccessService, 'assertRoleAllowed', async () => undefined);
  stub(restaurantAccessService, 'evaluate', async () => ({ allowed: true }));
  const intervals = new Set();
  const timeouts = new Set();
  for (const [method, timers] of [
    ['setInterval', intervals],
    ['setTimeout', timeouts],
  ]) {
    stub(globalThis, method, (callback) => {
      const timer = { callback, unref() {} };
      timers.add(timer);
      return timer;
    });
  }
  stub(globalThis, 'clearInterval', (timer) => intervals.delete(timer));
  stub(globalThis, 'clearTimeout', (timer) => timeouts.delete(timer));
  const transport = createSocketIoRealtimeTransport({
    emit: denyIo,
    in(room) {
      return {
        disconnectSockets() {
          for (const socket of sockets) if (socket.rooms.has(room)) socket.disconnect(true);
        },
      };
    },
    to(room) {
      return {
        emit(event, ...args) {
          for (const socket of sockets) {
            if (socket.connected && socket.rooms.has(room)) socket.emit(event, ...args);
          }
        },
      };
    },
  });
  restores.push(registerRealtimeTransport(transport));
  const connect = async (auth) => {
    const handlers = new Map();
    const socket = {
      id: `synthetic-${sockets.length}`,
      connected: true,
      rooms: new Set(),
      received: [],
      handshake: { auth },
      join(room) {
        this.rooms.add(room);
      },
      on(event, callback) {
        handlers.set(event, callback);
      },
      emit(event, ...args) {
        this.received.push({ event, args });
      },
      disconnect() {
        this.connected = false;
        this.rooms.clear();
        handlers.get('disconnect')?.();
      },
    };
    sockets.push(socket);
    let authError;
    await createSocketAuth()(socket, (error) => {
      authError = error;
    });
    if (authError) throw authError;
    socketHandler(socket);
    return socket;
  };
  const tick = async () => {
    for (const timer of [...intervals]) timer.callback();
    for (let n = 0; n < 15; n++) await Promise.resolve();
  };
  return { stub, connect, tick, intervals, timeouts };
}

function table(f) {
  const session = {
    id: 55,
    tableId: 91,
    restaurantId: 7,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 60_000),
    table: { id: 91, number: 12, restaurantId: 7 },
  };
  f.stub(tableSessionRepository, 'findBySessionToken', async () => ({ ...session }));
  f.stub(tableSessionRepository, 'findById', async (id, restaurantId) => {
    assert.equal(id, 55);
    assert.equal(restaurantId, 7);
    return { ...session };
  });
  return session;
}

test('session rooms isolate table occupancies and only send minimum client signals', async (t) => {
  const f = fixture(t);
  table(f);
  const socket = await f.connect({ sessionToken: 'synthetic-session' });
  assert.deepEqual([...socket.rooms], ['table-session:55']);
  const payload = {
    id: 9,
    tableId: 91,
    restaurantId: 7,
    tableSessionId: 56,
    type: 'WAITER',
    status: 'IN_PROGRESS',
    participant: { displayName: 'Fictional', phone: '555' },
  };
  await tableServiceCallEvents.updated(payload);
  assert.equal(socket.received.length, 0);
  await tableServiceCallEvents.updated({ ...payload, tableSessionId: 55 });
  assert.deepEqual(socket.received[0], {
    event: 'waiter-call:updated',
    args: [
      {
        id: 9,
        tableId: 91,
        tableSessionId: 55,
        type: 'WAITER',
        status: 'IN_PROGRESS',
      },
    ],
  });
  await tableParticipantStateEvents.orderingUpdated({
    ...payload,
    tableSessionId: 55,
    participantPublicId: 'private-participant',
    orderingBlocked: true,
    reason: 'BILL_REQUESTED',
  });
  assert.deepEqual(socket.received[1].args, [{ tableId: 91, tableSessionId: 55 }]);
  const order = {
    id: 42,
    tableSessionId: 55,
    table: { id: 91 },
    restaurantId: 7,
    type: 'MESA',
    status: 'PRONTO',
    items: [],
  };
  assert.equal(emitTableSessionOrderEvent(realtimePublisher, 'order:status-changed', order), true);
  assert.equal(socket.received[2].event, 'order:status-changed');
  assert.equal(
    emitTableSessionOrderEvent(realtimePublisher, 'order:status-changed', {
      ...order,
      tableSessionId: 56,
    }),
    true,
  );
  assert.equal(socket.received.length, 3);
  await tableSessionEvents.closed({
    sessionId: 55,
    tableId: 91,
    tableNumber: 12,
    restaurantId: 7,
    status: 'CLOSED',
  });
  assert.equal(socket.connected, false);
  assert.equal(socket.received.at(-1).event, 'table:session-closed');
  assert.equal(
    socket.received.some(({ event }) => event === '__socket:revoke-room__'),
    false,
  );
  assert.equal(f.intervals.size, 0);
});

for (const reason of ['CLOSED', 'EXPIRED', 'DATABASE_UNAVAILABLE']) {
  test(`periodic table revalidation disconnects ${reason}`, async (t) => {
    const f = fixture(t);
    const session = table(f);
    const socket = await f.connect({ sessionToken: 'synthetic-session' });
    await f.tick();
    assert.equal(socket.connected, true);
    session.status = 'CLOSING_REQUESTED';
    await f.tick();
    assert.equal(socket.connected, true);
    if (reason === 'CLOSED') session.status = 'CLOSED';
    if (reason === 'EXPIRED') session.expiresAt = new Date(0);
    if (reason === 'DATABASE_UNAVAILABLE')
      f.stub(tableSessionRepository, 'findById', async () => {
        throw new Error('offline');
      });
    await f.tick();
    assert.equal(socket.connected, false);
  });
}

function account(f) {
  const user = {
    id: 41,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 7,
    active: true,
    authVersion: 3,
    mustChangePassword: false,
    email: 'synthetic@example.test',
  };
  f.stub(prisma.user, 'findUnique', async () => ({ ...user }));
  const token = jwt.sign({ ...user, type: 'access' }, process.env.JWT_SECRET, { expiresIn: '1s' });
  return { user, token };
}

test('JWT expiry sends renewal signal then disconnects and clears timers', async (t) => {
  const f = fixture(t);
  const { token } = account(f);
  const socket = await f.connect({ token });
  assert.equal(socket.rooms.has('restaurant:7:admin'), true);
  const expiresAt = jwt.decode(token).exp * 1000;
  f.stub(Date, 'now', () => expiresAt);
  for (const timeout of [...f.timeouts]) timeout.callback();
  assert.equal(socket.connected, false);
  assert.deepEqual(socket.received, [{ event: 'auth:expired', args: [] }]);
  assert.equal(f.intervals.size, 0);
  assert.equal(f.timeouts.size, 0);
});

test('real logout revokes HTTP access and disconnects only the revoked socket version', async (t) => {
  const f = fixture(t);
  const { user, token } = account(f);
  const socket = await f.connect({ token });
  let refreshDeleted = false;
  f.stub(prisma, '$transaction', async (callback) =>
    callback({
      authRefreshSession: {
        deleteMany: async () => {
          refreshDeleted = true;
          return { count: 1 };
        },
      },
      user: {
        updateMany: async ({ where, data }) => {
          assert.equal(where.authVersion, 3);
          user.authVersion += data.authVersion.increment;
          return { count: 1 };
        },
      },
    }),
  );
  const refresh = jwt.sign(
    {
      id: 41,
      type: 'refresh',
      authVersion: 3,
      jti: 'fictional_refresh_identifier_123456',
      familyId: 'fictional_family_identifier_123456',
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '1h' },
  );
  await logoutService.execute(refresh);
  assert.equal(refreshDeleted, true);
  assert.equal(socket.connected, false);
  assert.equal(socket.received.length, 0, 'revocation must not ask the browser to renew');
  await assert.rejects(() => resolveAccessToken(token), /Sessão expirada/);
});

test('socket handshake rejects signed access credentials without expiration', async (t) => {
  const f = fixture(t);
  const { user } = account(f);
  const token = jwt.sign({ ...user, type: 'access' }, process.env.JWT_SECRET);
  await assert.rejects(() => f.connect({ token }), /sem validade/);
});

test('expired handshake exposes the renewal code, revoked credentials do not', async (t) => {
  const f = fixture(t);
  const { user, token } = account(f);
  const expired = jwt.sign({ ...user, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: '-1s',
  });
  await assert.rejects(
    () => f.connect({ token: expired }),
    (error) => error.data?.code === 'ACCESS_TOKEN_EXPIRED',
  );
  user.authVersion++;
  await assert.rejects(
    () => f.connect({ token }),
    (error) => error.data === undefined,
  );
  await assert.rejects(
    () => f.connect({ token: expired }),
    (error) => error.data === undefined,
  );
  user.authVersion--;
  user.active = false;
  await assert.rejects(
    () => f.connect({ token: expired }),
    (error) => error.data === undefined,
  );
});
