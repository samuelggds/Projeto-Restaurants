import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNoActivePartnerDispatch, ownCourierAvailableDispatchScope } from './ownCourierDispatchBoundary.js';

test('reserva PREPARED não bloqueia o motoboy próprio antes de qualquer contratação', () => {
  for (const status of [null, undefined, 'PREPARED', 'FAILED', 'CANCELED', 'DONE']) {
    assert.doesNotThrow(() => assertNoActivePartnerDispatch(status));
  }
});

test('despacho enviado, incerto ou ativo bloqueia motoboy próprio sem exceção', () => {
  for (const status of ['DISPATCHING', 'UNKNOWN', 'ACTIVE']) {
    assert.throws(() => assertNoActivePartnerDispatch(status), /despacho com motoboy parceiro/);
  }
});

test('filtro Prisma nega concorrência apenas nos estados de risco', () => {
  assert.deepEqual(ownCourierAvailableDispatchScope, {
    OR: [
      { externalDeliveryDispatch: { is: null } },
      { externalDeliveryDispatch: { is: { status: { notIn: ['DISPATCHING', 'UNKNOWN', 'ACTIVE'] } } } },
    ],
  });
});
