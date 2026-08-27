import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { tableAccountEvents } from '../modules/tableAccount/realtime/tableAccountEvents.js';
import { tableSessionEvents } from '../modules/tableSession/realtime/tableSessionEvents.js';
import { tableServiceCallEvents } from '../modules/waiterCalls/realtime/tableServiceCallEvents.js';
import { registerRealtimeTransport } from './realtimePublisher.js';

type PublishedEvent = { room: string; event: string; payload: unknown };

let unregister: (() => void) | undefined;

afterEach(() => {
  unregister?.();
  unregister = undefined;
});

function captureEvents() {
  const events: PublishedEvent[] = [];
  unregister = registerRealtimeTransport({
    emit() {},
    to(room) {
      return {
        emit(event, payload) {
          events.push({ room, event, payload });
        },
      };
    },
  });
  return events;
}

test('evento de conta da mesa alcança cliente, garçons e administradores', async () => {
  const events = captureEvents();
  const published = await tableAccountEvents.updated({
    sessionId: 12,
    restaurantId: 7,
    reason: 'PAYMENT_CREATED',
    occurredAt: '2026-08-27T12:00:00.000Z',
  });

  assert.equal(published, true);
  assert.deepEqual(
    events.map(({ room, event }) => ({ room, event })),
    [
      { room: 'table-session:12', event: 'table-account:updated' },
      { room: 'restaurant:7:waiter', event: 'table-account:updated' },
      { room: 'restaurant:7:admin', event: 'table-account:updated' },
    ],
  );
});

test('abertura e fechamento de mesa publicam somente nas salas esperadas', async () => {
  const events = captureEvents();
  const payload = {
    sessionId: 12,
    tableId: 4,
    tableNumber: 2,
    restaurantId: 7,
    status: 'OPEN' as const,
  };

  await tableSessionEvents.opened(payload);
  await tableSessionEvents.closed({ ...payload, status: 'CLOSED' });

  assert.deepEqual(
    events.map(({ room, event }) => ({ room, event })),
    [
      { room: 'restaurant:7:waiter', event: 'table:session-opened' },
      { room: 'restaurant:7:admin', event: 'table:session-opened' },
      { room: 'table-waiting:4', event: 'table:session-opened' },
      { room: 'restaurant:7:waiter', event: 'table:session-closed' },
      { room: 'restaurant:7:admin', event: 'table:session-closed' },
      { room: 'table-session:12', event: 'table:session-closed' },
    ],
  );
});

test('chamadas de garçom notificam somente as salas operacionais', async () => {
  const events = captureEvents();
  const payload = {
    id: 8,
    restaurantId: 7,
    tableId: 4,
    type: 'WAITER',
    status: 'OPEN',
  };

  await tableServiceCallEvents.created(payload);
  await tableServiceCallEvents.updated(payload);

  assert.deepEqual(
    events.map(({ room, event }) => ({ room, event })),
    [
      { room: 'restaurant:7:waiter', event: 'waiter-call:created' },
      { room: 'restaurant:7:admin', event: 'waiter-call:created' },
      { room: 'restaurant:7:waiter', event: 'waiter-call:updated' },
      { room: 'restaurant:7:admin', event: 'waiter-call:updated' },
      { room: 'table:4', event: 'waiter-call:updated' },
    ],
  );
});
