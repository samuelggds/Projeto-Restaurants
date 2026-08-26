import assert from 'node:assert/strict';
import test from 'node:test';
import { FakePaymentProvider } from './FakePaymentProvider.js';

test('cria cobrança simulada idempotente sem armazenar dados de cartão', async () => {
  const provider = new FakePaymentProvider({ enabled: true, webhookSecret: 'segredo-forte' });
  const input = {
    intentPublicId: 'd9836587-cbfa-4c12-973f-ff8821a0bf73',
    amountCents: 3_499,
    method: 'CARD' as const,
    idempotencyKeyHash: 'hash',
    expiresAt: new Date('2026-08-26T11:00:00.000Z'),
  };

  const first = await provider.createPayment(input);
  const repeated = await provider.createPayment(input);

  assert.deepEqual(repeated, first);
  assert.equal(first.externalId, `fake-table:${input.intentPublicId}`);
  assert.equal(JSON.stringify(first).includes('cardNumber'), false);
});

test('valida assinatura, valor e evento do webhook simulado', async () => {
  const provider = new FakePaymentProvider({ enabled: true, webhookSecret: 'segredo-forte' });
  const payment = await provider.createPayment({
    intentPublicId: 'f19e0a42-eec4-42ac-b156-e1bddad364aa',
    amountCents: 101,
    method: 'PIX',
    idempotencyKeyHash: 'hash',
    expiresAt: new Date('2026-08-26T11:00:00.000Z'),
  });

  const event = await provider.validateWebhook({
    headers: { 'x-fake-table-payment-secret': 'segredo-forte' },
    body: {
      eventId: 'event-1',
      externalId: payment.externalId,
      status: 'PAID',
      amountCents: 101,
      occurredAt: '2026-08-26T10:00:00.000Z',
    },
  });

  assert.equal(event.status, 'PAID');
  assert.equal((await provider.getPayment(payment.externalId)).status, 'PAID');
  await assert.rejects(
    () =>
      provider.validateWebhook({
        headers: { 'x-fake-table-payment-secret': 'errado' },
        body: {},
      }),
    /assinatura/i,
  );
});

test('estorna uma cobrança simulada de forma idempotente', async () => {
  const provider = new FakePaymentProvider({ enabled: true });
  const payment = await provider.createPayment({
    intentPublicId: '6d20c855-0a31-46e3-8a3b-c293822a56b2',
    amountCents: 2_599,
    method: 'PIX',
    idempotencyKeyHash: 'hash-refund',
    expiresAt: new Date('2026-08-26T11:00:00.000Z'),
  });

  const first = await provider.refundPayment({
    externalId: payment.externalId,
    idempotencyKey: 'refund-1',
  });
  const repeated = await provider.refundPayment({
    externalId: payment.externalId,
    idempotencyKey: 'refund-1',
  });

  assert.equal(first.status, 'REFUNDED');
  assert.deepEqual(repeated, first);
});

test('permanece bloqueado em produção mesmo com enabled explícito', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const provider = new FakePaymentProvider({ enabled: true, webhookSecret: 'segredo' });
    await assert.rejects(
      () =>
        provider.createPayment({
          intentPublicId: '88598cf7-6721-46ea-bf3e-456675237c74',
          amountCents: 100,
          method: 'PIX',
          idempotencyKeyHash: 'hash',
          expiresAt: new Date(Date.now() + 60_000),
        }),
      /desativado/i,
    );
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
