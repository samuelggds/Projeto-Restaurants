// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import refundOrderPaymentService from '../../orders/services/RefundOrderPaymentService.js';
import { getDirectTablePayment, mutateDirectTablePayment } from './tablePaymentGatewayMutation.js';
const original = { fetch: globalThis.fetch, settings: restaurantSettingsRepository.findByRestaurantId, refund: refundOrderPaymentService.execute };
afterEach(() => { globalThis.fetch = original.fetch; restaurantSettingsRepository.findByRestaurantId = original.settings; refundOrderPaymentService.execute = original.refund; });
const input = { restaurantId: 7, intentId: 91, provider: 'MERCADO_PAGO', method: 'PIX', externalId: '1234', amountCents: 3000, expiresAt: new Date() };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const mutation = { externalId: '1234', idempotencyKey: 'stable-key' };
function credentials() {
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { mercadoPagoAccessToken: 'tenant-mp', asaasAccessToken: 'tenant-asaas', pagbankToken: 'tenant-pagbank' };
  };
}

test('MP: reusa estorno dos pedidos com tenant/chave estável e só confirma depois da consulta', async () => {
  credentials(); let refunded = false;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.mercadopago.com/v1/payments/1234');
    assert.equal(init.headers.Authorization, 'Bearer tenant-mp');
    return json({ id: 1234, status: refunded ? 'refunded' : 'approved', transaction_amount: 30, currency_id: 'BRL' });
  };
  refundOrderPaymentService.execute = async (order, options) => {
    assert.equal(order.restaurantId, 7); assert.equal(order.pixPaymentId, '1234'); assert.equal(options.idempotencyKey, 'stable-key');
    refunded = true; return { provider: 'MERCADO_PAGO', externalId: 'refund-1' };
  };
  assert.equal((await mutateDirectTablePayment(input, 'refund', mutation)).status, 'REFUNDED');
});

test('MP: cancelamento de pendente usa PUT e reconcilia estado confirmado', async () => {
  credentials(); let canceled = false;
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'PUT') { assert.equal(JSON.parse(init.body).status, 'cancelled'); canceled = true; }
    return json({ id: 1234, status: canceled ? 'cancelled' : 'pending', transaction_amount: 30, currency_id: 'BRL' });
  };
  assert.equal((await mutateDirectTablePayment(input, 'cancel', mutation)).status, 'CANCELED');
});

test('checkout preference ambíguo nunca é convertido em estorno de outro pedido', async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error(); };
  await assert.rejects(() => mutateDirectTablePayment({ ...input, method: 'CARD', externalId: 'mp_pref:preference' }, 'refund', mutation), /sem referência/);
  assert.equal(calls, 0);
});

for (const bad of [{ id: 9999, currency_id: 'BRL', transaction_amount: 30 }, { id: 1234, currency_id: 'USD', transaction_amount: 30 }, { id: 1234, currency_id: 'BRL', transaction_amount: 1 }]) {
  test(`não estorna cobrança com evidência divergente ${JSON.stringify(bad)}`, async () => {
    credentials(); globalThis.fetch = async () => json({ ...bad, status: 'approved' });
    refundOrderPaymentService.execute = async () => { assert.fail('não pode estornar'); };
    await assert.rejects(() => mutateDirectTablePayment(input, 'refund', mutation), /não corresponde/);
  });
}

test('Asaas: HTTP aceito com estorno pendente não vira REFUNDED', async () => {
  credentials(); let requested = false;
  globalThis.fetch = async () => json({ id: 'pay_abc', status: requested ? 'REFUND_REQUESTED' : 'RECEIVED', value: 30,
    refunds: requested ? [{ status: 'PENDING', value: 30 }] : [] });
  refundOrderPaymentService.execute = async () => { requested = true; return { provider: 'ASAAS', externalId: 'pay_abc' }; };
  const result = await mutateDirectTablePayment({ ...input, provider: 'ASAAS', externalId: 'asaas:pay_abc' }, 'refund', mutation);
  assert.equal(result.status, 'PENDING');
});

test('Asaas: soma somente devoluções DONE, sem contar PENDING/CANCELLED', async () => {
  credentials();
  for (const done of [10, 30]) {
    globalThis.fetch = async () => json({ id: 'pay_abc', status: 'REFUNDED', value: 30,
      refunds: [{ status: 'DONE', value: done }, { status: 'CANCELLED', value: 20 }, { status: 'PENDING', value: 20 }] });
    assert.equal((await getDirectTablePayment({ ...input, provider: 'ASAAS', externalId: 'asaas:pay_abc' })).status, done === 30 ? 'REFUNDED' : 'PENDING');
  }
});

test('PagBank: cancelado só representa estorno quando devolução integral está comprovada', async () => {
  credentials();
  for (const refunded of [0, 1000, 3000]) {
    globalThis.fetch = async () => json({ id: 'CHAR_abc', status: 'CANCELED', amount: { value: 3000, currency: 'BRL', summary: { refunded } } });
    const result = await getDirectTablePayment({ ...input, provider: 'PAGBANK', method: 'CARD', externalId: 'pagbank_tx:CHAR_abc' });
    assert.equal(result.status, refunded === 3000 ? 'REFUNDED' : 'CANCELED');
  }
});
