// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';

import orderRepository from '../repositories/OrderRepository.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import BelvoOrderWebhookController from './BelvoOrderWebhookController.js';

const originalFindByPixPaymentId = orderRepository.findByPixPaymentId;
const originalFinalize = finalizeOrderPixPaymentService.execute;
const originalToken = process.env.BELVO_WEBHOOK_TOKEN;

function responseRecorder() {
  const result = { statusCode: 200, body: undefined };
  return {
    result,
    res: {
      status(code) {
        result.statusCode = code;
        return this;
      },
      json(body) {
        result.body = body;
        return this;
      },
    },
  };
}

afterEach(() => {
  orderRepository.findByPixPaymentId = originalFindByPixPaymentId;
  finalizeOrderPixPaymentService.execute = originalFinalize;
  if (originalToken === undefined) delete process.env.BELVO_WEBHOOK_TOKEN;
  else process.env.BELVO_WEBHOOK_TOKEN = originalToken;
});

test('webhook Belvo exige o Bearer configurado', async () => {
  process.env.BELVO_WEBHOOK_TOKEN = 'b'.repeat(48);
  const { res, result } = responseRecorder();

  await BelvoOrderWebhookController.handle(
    {
      headers: { authorization: 'Bearer incorreto' },
      body: {
        webhook_type: 'PAYMENT_INTENTS',
        webhook_code: 'STATUS_UPDATE',
        object_id: '0d3ffb69-f83b-456e-ad8e-208d0998d71d',
        data: { status: 'SUCCEEDED' },
      },
    },
    res,
  );

  assert.equal(result.statusCode, 401);
});

test('webhook Belvo ignora outros recursos e estados sem consultar pedido', async () => {
  process.env.BELVO_WEBHOOK_TOKEN = 'b'.repeat(48);
  let reads = 0;
  orderRepository.findByPixPaymentId = async () => {
    reads += 1;
    return null;
  };

  for (const body of [
    {
      webhook_type: 'BANK_ACCOUNTS',
      webhook_code: 'STATUS_UPDATE',
      object_id: '0d3ffb69-f83b-456e-ad8e-208d0998d71d',
      data: { status: 'SUCCEEDED' },
    },
    {
      webhook_type: 'PAYMENT_INTENTS',
      webhook_code: 'STATUS_UPDATE',
      object_id: '0d3ffb69-f83b-456e-ad8e-208d0998d71d',
      data: { status: 'PROCESSING' },
    },
  ]) {
    const { res, result } = responseRecorder();
    await BelvoOrderWebhookController.handle(
      { headers: { authorization: `Bearer ${process.env.BELVO_WEBHOOK_TOKEN}` }, body },
      res,
    );
    assert.equal(result.statusCode, 200);
  }

  assert.equal(reads, 0);
});

test('webhook SUCCEEDED reconcilia somente o pedido vinculado e limita a consulta externa', async () => {
  process.env.BELVO_WEBHOOK_TOKEN = 'b'.repeat(48);
  const intentId = '0d3ffb69-f83b-456e-ad8e-208d0998d71d';
  orderRepository.findByPixPaymentId = async (paymentId) => {
    assert.equal(paymentId, `belvo:${intentId}`);
    return { id: 91, restaurantId: 7 };
  };

  let finalized = null;
  finalizeOrderPixPaymentService.execute = async (payload) => {
    finalized = payload;
    return { id: 91, restaurantId: 7, paid: true };
  };

  const { res, result } = responseRecorder();
  await BelvoOrderWebhookController.handle(
    {
      headers: { authorization: `Bearer ${process.env.BELVO_WEBHOOK_TOKEN}` },
      body: {
        webhook_type: 'PAYMENT_INTENTS',
        webhook_code: 'STATUS_UPDATE',
        object_id: intentId,
        data: { status: 'SUCCEEDED' },
      },
    },
    res,
  );

  assert.equal(result.statusCode, 200);
  assert.deepEqual(finalized, {
    orderId: 91,
    restaurantId: 7,
    paymentId: `belvo:${intentId}`,
    providerTimeoutMs: 3500,
  });
});
