import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'socket.io';
import { createSocketIoRealtimeTransport } from './socketIoRealtimeTransport.js';

test('adaptador encaminha emissões globais e por sala ao Socket.IO', () => {
  const calls: Array<{ room?: string; event: string; args: unknown[] }> = [];
  const socketIo = {
    emit(event: string, ...args: unknown[]) {
      calls.push({ event, args });
    },
    to(room: string) {
      return {
        emit(event: string, ...args: unknown[]) {
          calls.push({ room, event, args });
        },
      };
    },
  } as unknown as Server;

  const transport = createSocketIoRealtimeTransport(socketIo);
  transport.emit('system:updated', 1);
  transport.to('restaurant:9').emit('order:updated', { id: 3 });

  assert.deepEqual(calls, [
    { event: 'system:updated', args: [1] },
    { room: 'restaurant:9', event: 'order:updated', args: [{ id: 3 }] },
  ]);
});
