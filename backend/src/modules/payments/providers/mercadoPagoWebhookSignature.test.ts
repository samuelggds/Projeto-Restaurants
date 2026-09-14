import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyMercadoPagoSignature, mercadoPagoWebhookSecrets, authenticateMercadoPagoWebhook } from './mercadoPagoWebhookSignature.js';
import type { Request, Response } from 'express';

const secret = 'test-webhook-secret';
function notification(id = '123456', ts = '1742505638683') {
  const requestId = '2066ca19-c6f1-498a-be75-1923005edd06';
  const signature = createHmac('sha256', secret).update(`id:${id.toLowerCase()};request-id:${requestId};ts:${ts};`).digest('hex');
  return { query: { 'data.id': id }, body: { id: 'event-id', data: { id } }, headers: { 'x-request-id': requestId, 'x-signature': `ts=${ts},v1=${signature}` } };
}
test('valida pagamentos e orders Point, incluindo timestamp em segundos e milissegundos', () => {
  for (const id of ['123456', 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3']) {
    for (const ts of ['1742505638', '1742505638683']) {
      const req = notification(id, ts);
      assert.equal(verifyMercadoPagoSignature(req, ['previous-secret', secret]), id);
      // Reenvios legítimos permanecem autenticados; a persistência financeira é idempotente.
      assert.equal(verifyMercadoPagoSignature(req, [secret]), id);
    }
  }
});
test('rejeita corpo divergente, URL alterada, header ausente/duplicado e assinatura inválida', () => {
  const requests = [
    { ...notification(), body: { data: { id: 'another-payment' } } },
    { ...notification(), query: { 'data.id': 'another-payment' } },
    { ...notification(), query: { 'data.id': ['123456', 'another-payment'] } },
    { ...notification(), headers: {} },
    { ...notification(), headers: { ...notification().headers, 'x-signature': 'ts=1742505638,v1=invalid' } },
    { ...notification(), headers: { ...notification().headers, 'x-signature': notification().headers['x-signature'] + ',ts=1742505638' } },
  ];
  for (const req of requests) assert.equal(verifyMercadoPagoSignature(req, [secret]), null);
  assert.equal(verifyMercadoPagoSignature(notification(), ['wrong-secret']), null);
});
test('configuração permite aplicações distintas e rotação, rejeitando JSON inválido', () => {
  assert.deepEqual(mercadoPagoWebhookSecrets({ MP_WEBHOOK_SECRET: secret, MP_WEBHOOK_SECRETS: '["another-secret"]' }), [secret, 'another-secret']);
  assert.throws(() => mercadoPagoWebhookSecrets({ MP_WEBHOOK_SECRETS: '{"secret":"value"}' }));
});
test('entrada falha fechada sem segredo e não aceita assinatura inválida', () => {
  const previous = { MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET, MP_WEBHOOK_SECRETS: process.env.MP_WEBHOOK_SECRETS };
  let status = 0;
  const response = { status(code: number) { status = code; return this; }, json() {} } as unknown as Response;
  try {
    delete process.env.MP_WEBHOOK_SECRET;
    delete process.env.MP_WEBHOOK_SECRETS;
    assert.equal(authenticateMercadoPagoWebhook(notification() as unknown as Request, response), null);
    assert.equal(status, 503);
    process.env.MP_WEBHOOK_SECRET = 'wrong-secret';
    assert.equal(authenticateMercadoPagoWebhook(notification() as unknown as Request, response), null);
    assert.equal(status, 401);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
