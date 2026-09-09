// @ts-nocheck
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import pix from './OrderPixPaymentService.js';
import settingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import split from '../../billing/services/SplitService.js';

const originals = {
  settings: settingsRepository.findPublicByRestaurantId,
  privateSettings: settingsRepository.findByRestaurantId,
  split: split.execute,
  api: pix.getMercadoPagoPaymentApi,
  fetch: globalThis.fetch,
};
let provider: string;
beforeEach(() => {
  provider = 'MERCADO_PAGO';
  settingsRepository.findPublicByRestaurantId = async () => ({
    pixProvider: provider,
    pixKey: 'tenant-pix-key',
    isOpenForOrders: true,
  });
  settingsRepository.findByRestaurantId = async () => ({
    asaasAccessToken: 'test-token',
    pagbankToken: 'test-token',
  });
  split.execute = async () => 0;
});
afterEach(() => {
  settingsRepository.findPublicByRestaurantId = originals.settings;
  settingsRepository.findByRestaurantId = originals.privateSettings;
  split.execute = originals.split;
  pix.getMercadoPagoPaymentApi = originals.api;
  globalThis.fetch = originals.fetch;
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
  assert.deepEqual(requests[0], requests[1]);
});

test('PagBank usa a chave persistida, inclusive após timeout', async () => {
  provider = 'PAGBANK';
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(init);
    if (requests.length === 1) throw new Error('timeout');
    return new Response(JSON.stringify({ id: 'ORDE-91', qr_codes: [{ text: 'pix-payload' }] }), {
      status: 200,
    });
  };
  await assert.rejects(() => pix.createPixPayment(payload), /timeout/);
  await pix.createPixPayment({ ...payload, resumeOnly: true });
  assert.equal(requests[0].headers['x-idempotency-key'], payload.idempotencyKey);
  assert.equal(requests[0].headers['x-idempotency-key'], requests[1].headers['x-idempotency-key']);
  assert.equal(requests[0].body, requests[1].body);
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

for (const imageUrl of ['https://attacker.example.test/qr', 'https://api.pagseguro.com/qr']) {
  test(`imagem opcional PIX não vaza token nem perde cobrança (${imageUrl})`, async () => {
    provider = 'PAGBANK';
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push(String(url));
      assert.equal(init.redirect, 'error');
      assert.ok(init.signal instanceof AbortSignal);
      if (calls.length > 1) throw new Error('optional image timeout');
      return new Response(
        JSON.stringify({
          id: 'ORDE-91',
          qr_codes: [{ text: 'existing-qr', links: [{ rel: 'QRCODE.BASE64', href: imageUrl }] }],
        }),
      );
    };
    const result = await pix.createPixPayment(payload);
    assert.equal(result.qrCode, 'existing-qr');
    assert.equal(result.paymentId, 'pagbank:ORDE-91');
    assert.equal(result.qrCodeBase64, null);
    assert.equal(calls.length, imageUrl.includes('attacker') ? 1 : 2);
  });
}

for (const data of [
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
