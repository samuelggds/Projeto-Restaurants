// @ts-nocheck
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import prisma from '../config/prisma.js';
import { createSocketAuth } from './socketAuth.js';
import { socketHandler } from './socketHandler.js';
import tableSessionRepository from '../modules/tableSession/repositories/TableSessionRepository.js';
import resolvePublicTableService from '../modules/table/services/ResolvePublicTableService.js';
import { tableSessionEvents } from '../modules/tableSession/realtime/tableSessionEvents.js';
import { tableParticipantStateEvents } from '../modules/tableSession/realtime/tableParticipantStateEvents.js';
import { tableServiceCallEvents } from '../modules/waiterCalls/realtime/tableServiceCallEvents.js';
import { emitTableSessionOrderEvent } from '../modules/orders/utils/waiterOrderRealtime.js';
import { createSocketIoRealtimeTransport } from '../realtime/socketIoRealtimeTransport.js';
import { realtimePublisher, registerRealtimeTransport } from '../realtime/realtimePublisher.js';

function nextEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Evento não recebido: ${event}`)), 3000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

test(
  'Socket.IO real isola reabertura da mesa, entrega fechamento antes da revogação e minimiza dados',
  { timeout: 10_000 },
  async (t) => {
    const denyIo = () => {
      throw new Error('Unexpected database/provider IO');
    };
    const originalRequest = prisma._request;
    const originalConnect = prisma.$connect;
    prisma._request = denyIo;
    prisma.$connect = denyIo;
    t.after(() => {
      prisma._request = originalRequest;
      prisma.$connect = originalConnect;
    });
    t.mock.method(globalThis, 'fetch', denyIo);
    const http = createServer();
    const server = new Server(http);
    const clients = [];
    let oldSessionOpen = true;
    const session = (id) => ({
      id,
      restaurantId: 7,
      tableId: 91,
      status: 'OPEN',
      expiresAt: new Date(Date.now() + 60_000),
      table: { id: 91, number: 1, restaurantId: 7 },
    });
    t.mock.method(tableSessionRepository, 'findBySessionToken', async (token) =>
      token === 'old-session'
        ? oldSessionOpen
          ? session(55)
          : null
        : token === 'new-session'
          ? session(56)
          : token === 'other-session'
            ? session(57)
            : null,
    );
    t.mock.method(resolvePublicTableService, 'execute', async () => ({
      id: 91,
      number: 1,
      restaurantId: 7,
    }));
    server.use(createSocketAuth(async () => undefined));
    server.on('connection', socketHandler);
    const unregister = registerRealtimeTransport(createSocketIoRealtimeTransport(server));
    try {
      await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
      const url = `http://127.0.0.1:${http.address().port}`;
      const open = async (token, waiting = false) => {
        const client = connect(url, {
          auth: waiting ? { tableToken: token } : { sessionToken: token },
          transports: ['websocket'],
          reconnection: false,
          forceNew: true,
          autoConnect: false,
        });
        clients.push(client);
        const connected = nextEvent(client, 'connect');
        client.connect();
        await connected;
        return client;
      };
      const oldClient = await open('old-session');
      const oldSocket = server.sockets.sockets.get(oldClient.id);
      assert.equal(oldSocket.rooms.has('table:91'), false);
      assert.equal(oldSocket.rooms.has('table-session:55'), true);
      const waitingClient = await open('public-qr', true);
      const waitingReceived = [];
      waitingClient.onAny((event, payload) => waitingReceived.push({ event, payload }));

      const oldReceived = [];
      oldClient.onAny((event, payload) => oldReceived.push({ event, payload }));
      const closed = nextEvent(oldClient, 'table:session-closed');
      const disconnected = nextEvent(oldClient, 'disconnect');
      oldSessionOpen = false;
      await tableSessionEvents.closed({
        sessionId: 55,
        tableId: 91,
        tableNumber: 1,
        restaurantId: 7,
        status: 'CLOSED',
      });
      assert.equal((await closed).sessionId, 55);
      assert.equal(await disconnected, 'io server disconnect');
      assert.equal(oldSocket.connected, false);

      const opened = nextEvent(waitingClient, 'table:session-opened');
      await tableSessionEvents.opened({
        sessionId: 56,
        tableId: 91,
        tableNumber: 1,
        restaurantId: 7,
        status: 'OPEN',
      });
      assert.equal((await opened).sessionId, 56);
      const newClient = await open('new-session');
      const otherClient = await open('other-session');
      const otherReceived = [];
      otherClient.onAny((event, payload) => otherReceived.push({ event, payload }));
      const callReceived = nextEvent(newClient, 'waiter-call:updated');
      await tableServiceCallEvents.updated({
        id: 80,
        restaurantId: 7,
        tableId: 91,
        tableSessionId: 56,
        type: 'BILL',
        status: 'IN_PROGRESS',
        participant: {
          publicId: 'private-participant',
          displayName: 'Cliente privado',
          phone: '11987654321',
        },
        assignedTo: { id: 10, name: 'Funcionário privado' },
      });
      assert.deepEqual(await callReceived, {
        id: 80,
        tableId: 91,
        tableSessionId: 56,
        type: 'BILL',
        status: 'IN_PROGRESS',
      });
      const participantReceived = nextEvent(newClient, 'table-participant:ordering-updated');
      await tableParticipantStateEvents.orderingUpdated({
        restaurantId: 7,
        tableId: 91,
        tableSessionId: 56,
        participantPublicId: 'private-participant',
        orderingBlocked: true,
        reason: 'BILL_REQUESTED',
        occurredAt: new Date(),
      });
      assert.deepEqual(await participantReceived, { tableId: 91, tableSessionId: 56 });
      const orderReceived = nextEvent(newClient, 'order:status-changed');
      assert.equal(
        emitTableSessionOrderEvent(realtimePublisher, 'order:status-changed', {
          id: 123,
          restaurantId: 7,
          type: 'MESA',
          status: 'PRONTO',
          tableSessionId: 56,
          table: { id: 91, number: 1 },
        }),
        true,
      );
      assert.equal((await orderReceived).id, 123);
      assert.deepEqual(
        oldReceived.map(({ event }) => event),
        ['table:session-closed'],
      );
      assert.deepEqual(otherReceived, [], 'outra sessão da mesma mesa não recebe dados');
      assert.deepEqual(
        waitingReceived.map(({ event }) => event),
        ['table:session-opened'],
      );
      assert.equal(JSON.stringify(waitingReceived).includes('private'), false);

      const rejected = nextEvent(oldClient, 'connect_error');
      oldClient.connect();
      assert.match((await rejected).message, /Sessão da mesa inválida/u);
    } finally {
      for (const client of clients) client.disconnect();
      unregister();
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
