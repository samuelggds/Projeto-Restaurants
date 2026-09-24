// @ts-nocheck
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pix from './OrderPixPaymentService.js';
import settingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';

const originals = {
  settings: settingsRepository.findPublicByRestaurantId,
  privateSettings: settingsRepository.findByRestaurantId,
  api: pix.getMercadoPagoPaymentApi,
  fetch: globalThis.fetch,
};
let provider: string;
const originalFutureProviders = process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS;
beforeEach(() => {
  process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS = 'true';
  provider = 'MERCADO_PAGO';
  settingsRepository.findPublicByRestaurantId = async () => ({
    pixProvider: provider,
    pixKey: 'tenant-pix-key',
    isOpenForOrders: true,
  });
  settingsRepository.findByRestaurantId = async () => ({
    asaasAccessToken: 'test-token',
  });
});
afterEach(() => {
  settingsRepository.findPublicByRestaurantId = originals.settings;
  settingsRepository.findByRestaurantId = originals.privateSettings;
  pix.getMercadoPagoPaymentApi = originals.api;
  globalThis.fetch = originals.fetch;
  if (originalFutureProviders === undefined) delete process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS;
  else process.env.ENABLE_FUTURE_PAYMENT_PROVIDERS = originalFutureProviders;
});
const payload = {
  restaurantId: 7,
  type: 'RETIRADA',
  paymentMethod: 'PIX',
  items: [],
  orderId: 91,
  orderTotal: 25,
  orderSubtotal: 25,
  orderDeliveryFee: 0,
  idempotencyKey: 'pickup-attempt-uuid',
};

test('Mercado Pago repete a mesma chave e o mesmo pagador na retomada', async () => {
  const requests = [];
  pix.getMercadoPagoPaymentApi = async () => ({
    create: async (request) => {
      requests.push(request);
      return {
        id: 991,
        status: 'pending',
        point_of_interaction: { transaction_data: { qr_code: 'pix-payload' } },
      };
    },
  });
  await pix.createPixPayment(payload);
  await pix.createPixPayment({ ...payload, resumeOnly: true });
  assert.equal(requests[0].requestOptions.idempotencyKey, payload.idempotencyKey);
  assert.equal(Object.hasOwn(requests[0].body, 'application_fee'), false);
  assert.deepEqual(requests[0], requests[1]);
});

test('Asaas retoma cobrança existente por referência sem qualquer POST', async () => {
  provider = 'ASAAS';
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    assert.equal(init.method, 'GET');
    if (String(url).includes('/v3/payments?')) {
      assert.match(String(url), /externalReference=orderpix%3A7%3A91/);
      return new Response(
        JSON.stringify({
          data: [
            { id: 'pay_91', externalReference: 'orderpix:7:91', value: 25, status: 'PENDING' },
          ],
          hasMore: false,
        }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ payload: 'existing-pix', encodedImage: null }), {
      status: 200,
    });
  };
  const result = await pix.createPixPayment({ ...payload, resumeOnly: true });
  assert.equal(result.paymentId, 'asaas:pay_91');
  assert.equal(result.qrCode, 'existing-pix');
  assert.equal(calls.length, 2);
});

or (const data of [
  [],
  [{ id: 'wrong', externalReference: 'other-tenant', value: 25 }],
  [{ id: 'wrong', externalReference: 'orderpix:7:91', value: 0.01 }],
  [
    { id: 'a', externalReference: 'orderpix:7:91', value: 25 },
    { id: 'b', externalReference: 'orderpix:7:91', value: 25 },
  ],
]) {
  test(`Asaas recusa retomada ambígua ou divergente (${JSON.stringify(data)}) sem recriar`, async () => {
    provider = 'ASAAS';
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++;
      assert.equal(init.method, 'GET');
      return new Response(JSON.stringify({ data }), { status: 200 });
    };
    await assert.rejects(
      () => pix.createPixPayment({ ...payload, resumeOnly: true }),
      /conciliação/i,
    );
    assert.equal(calls, 1);
  });
}


test('Asaas cria Pix diretamente na conta do restaurante sem split', async () => {
  provider = 'ASAAS';
  const paymentBodies = [];
  globalThis.fetch = async (url, init = {}) => {
    if (String(url).endsWith('/v3/customers')) {
      return new Response(JSON.stringify({ id: 'cus_91' }), { status: 200 });
    }
    if (String(url).endsWith('/v3/payments')) {
      paymentBodies.push(JSON.parse(String(init.body || '{}')));
      return new Response(JSON.stringify({ id: 'pay_91', status: 'PENDING' }), { status: 200 });
    }
    if (String(url).endsWith('/v3/payments/pay_91/pixQrCode')) {
      return new Response(JSON.stringify({ payload: 'asaas-pix', encodedImage: null }), {
        status: 200,
      });
    }
    return new Response('{}', { status: 404 });
  };

  const result = await pix.createPixPayment(payload);
  assert.equal(result.paymentId, 'asaas:pay_91');
  assert.equal(paymentBodies.length, 1);
  assert.equal(Object.hasOwn(paymentBodies[0], 'split'), false);
});
