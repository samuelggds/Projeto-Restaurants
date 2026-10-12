import assert from 'node:assert/strict';
import test from 'node:test';
import { registerRealtimeTransport } from '../../../realtime/realtimePublisher.js';
import { tableReservationEvents } from './tableReservationEvents.js';

test('notifica apenas salas autorizadas do restaurante, sem dados pessoais', () => {
  const received: Array<{room:string;event:string;payload:unknown}> = [];
  const dispose = registerRealtimeTransport({
    emit: () => { throw new Error('Não é permitido broadcast global.'); },
    to: (room) => ({
      emit: (event, payload) => {
        received.push({room, event, payload});
        return true;
      },
    }),
  });
  try {
    tableReservationEvents.changed(7);
    assert.deepEqual(received, [
      {room:'restaurant:7:waiter',event:'table:reservations-changed',payload:{changed:true}},
      {room:'restaurant:7:admin',event:'table:reservations-changed',payload:{changed:true}},
    ]);
    assert.throws(() => tableReservationEvents.changed(0), /Restaurante inválido/u);
  } finally {
    dispose();
  }
});
