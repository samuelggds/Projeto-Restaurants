import assert from 'node:assert/strict';
import test from 'node:test';
import { realtimePublisher, registerRealtimeTransport } from './realtimePublisher.js';

test('publica eventos globais e por sala pelo transporte registrado', () => {
  const calls: Array<{ room?: string; event: string; args: unknown[] }> = [];
  const unregister = registerRealtimeTransport({
    emit(event, ...args) {
      calls.push({ event, args });
    },
    to(room) {
      return {
        emit(event, ...args) {
          calls.push({ room, event, args });
        },
      };
    },
  });

  realtimePublisher.emit('system:updated', { id: 1 });
  realtimePublisher.to('restaurant:7').emit('order:updated', { id: 91 }, 'extra');
  unregister();

  assert.deepEqual(calls, [
    { event: 'system:updated', args: [{ id: 1 }] },
    { room: 'restaurant:7', event: 'order:updated', args: [{ id: 91 }, 'extra'] },
  ]);
});

test('disposer antigo não remove um transporte registrado depois', () => {
  const calls: string[] = [];
  const unregisterFirst = registerRealtimeTransport({
    emit() {},
    to() {
      return { emit() {} };
    },
  });
  const unregisterSecond = registerRealtimeTransport({
    emit(event) {
      calls.push(event);
    },
    to() {
      return { emit() {} };
    },
  });

  unregisterFirst();
  realtimePublisher.emit('still:active');
  unregisterSecond();

  assert.deepEqual(calls, ['still:active']);
});

test('sem transporte o publisher é um no-op explícito', () => {
  const originalWarn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args) => warnings.push(args);
  const unregister = registerRealtimeTransport({
    emit() {},
    to() {
      return { emit() {} };
    },
  });
  unregister();

  try {
    assert.equal(realtimePublisher.emit('ignored'), false);
    assert.equal(realtimePublisher.to('room').emit('ignored'), false);
    assert.deepEqual(warnings, [['[REALTIME_TRANSPORT_NOT_CONFIGURED]']]);
  } finally {
    console.warn = originalWarn;
  }
});
