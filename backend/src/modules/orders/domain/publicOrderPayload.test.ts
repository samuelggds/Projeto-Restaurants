import assert from 'node:assert/strict';
import test from 'node:test';
import { Decimal } from '@prisma/client/runtime/library';
import { publicOrderPayload } from './publicOrderPayload.js';
import {
  realtimePublisher,
  registerRealtimeTransport,
} from '../../../realtime/realtimePublisher.js';

test('remove material interno em envelopes aninhados sem alterar o objeto usado pela transação', () => {
  const createdAt = new Date('2026-09-08T12:00:00Z');
  const total = new Decimal('12.50');
  const order = {
    id: 9,
    creationRequestKey: 'private',
    creationActor: 'guest',
    creationFingerprint: 'hash',
    refundIdempotencyKey: 'refund-key',
    paymentConfirmationPin: 'hmac',
    paymentConfirmationPinExpiresAt: createdAt,
    total,
    createdAt,
  };
  const safe = publicOrderPayload({ orders: [order], pin: '1234' });
  assert.deepEqual(JSON.parse(JSON.stringify(safe)), {
    orders: [{ id: 9, total: '12.5', createdAt: createdAt.toISOString() }],
    pin: '1234',
  });
  assert.equal(order.creationRequestKey, 'private');
  assert.equal(safe.orders[0].createdAt, createdAt);
  assert.equal(safe.orders[0].total, total);
});

test('eventos por sala e globais não expõem material de idempotência nem HMAC', () => {
  const calls: unknown[] = [];
  const dispose = registerRealtimeTransport({
    emit: (_event, payload) => calls.push(payload),
    to: () => ({ emit: (_event, payload) => calls.push(payload) }),
  });
  try {
    realtimePublisher.emit('order:updated', { id: 1, creationFingerprint: 'hash' });
    realtimePublisher
      .to('user:2')
      .emit('order:updated', { order: { id: 1, paymentConfirmationPin: 'hmac' } });
    assert.deepEqual(calls, [{ id: 1 }, { order: { id: 1 } }]);
  } finally {
    dispose();
  }
});
