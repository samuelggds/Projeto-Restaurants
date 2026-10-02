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


test('eventos operacionais de pedido em realtime viram sinais mínimos sem PII', () => {
  const calls: Array<{ event: string; payload: unknown }> = [];
  const dispose = registerRealtimeTransport({
    emit: (event, payload) => calls.push({ event, payload }),
    to: () => ({ emit: (event, payload) => calls.push({ event, payload }) }),
  });
  try {
    realtimePublisher.to('restaurant:10').emit('order:status-changed', {
      id: 77,
      restaurantId: 10,
      type: 'DELIVERY',
      status: 'PRONTO',
      paid: true,
      paymentMethod: 'PIX',
      address: 'Rua privada, 123',
      user: { name: 'Cliente', email: 'cliente@exemplo.com', phone: '85999999999' },
      pixPaymentId: 'provider-private-id',
      creationFingerprint: 'hash',
    });

    assert.equal(calls.length, 1);
    const payload = calls[0].payload as Record<string, unknown>;
    assert.equal(calls[0].event, 'order:status-changed');
    assert.equal(payload.id, 77);
    assert.equal(payload.restaurantId, 10);
    assert.equal(payload.type, 'DELIVERY');
    assert.equal(payload.status, 'PRONTO');
    assert.equal(payload.paid, true);
    assert.equal(payload.paymentMethod, 'PIX');
    assert.match(String(payload.updatedAt), /^\d{4}-\d{2}-\d{2}T/u);
    assert.equal('user' in payload, false);
    assert.equal('address' in payload, false);
    assert.equal('pixPaymentId' in payload, false);
  } finally {
    dispose();
  }
});
