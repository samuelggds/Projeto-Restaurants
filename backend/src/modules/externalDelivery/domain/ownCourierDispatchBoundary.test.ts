import assert from 'node:assert/strict';
import test from 'node:test';
import { assertNoActivePartnerDispatch, ownCourierAvailableDispatchScope } from './ownCourierDispatchBoundary.js';

test('somente despacho ausente, cancelado ou falhado libera motoqueiro próprio', () => {
  for (const status of [null, undefined, 'FAILED', 'CANCELED']) {
    assert.doesNotThrow(() => assertNoActivePartnerDispatch(status));
  }
});

test('solicitação PREPARED já bloqueia retirada própria, mesmo antes do booking', () => {
  for (const status of ['PREPARED', 'DISPATCHING', 'UNKNOWN', 'ACTIVE', 'DONE', 'UNRECOGNIZED']) {
    assert.throws(() => assertNoActivePartnerDispatch(status), /reservado para entrega parceira/);
  }
});

test('filtro Prisma só libera registro externo com cancelamento/falha confirmados', () => {
  assert.deepEqual(ownCourierAvailableDispatchScope, {
    OR: [
      { externalDeliveryDispatch: { is: null } },
      { externalDeliveryDispatch: { is: { status: { in: ['FAILED', 'CANCELED'] } } } },
    ],
  });
});
