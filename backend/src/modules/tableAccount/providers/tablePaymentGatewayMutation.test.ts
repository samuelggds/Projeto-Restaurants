// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import refundOrderPaymentService from '../../orders/services/RefundOrderPaymentService.js';
import { getDirectTablePayment, mutateDirectTablePayment } from './tablePaymentGatewayMutation.js';
const original = {
  fetch: globalThis.fetch,
  settings: restaurantSettingsRepository.findByRestaurantId,
  refund: refundOrderPaymentService.execute,
};
afterEach(() => {
  globalThis.fetch = original.fetch;
  restaurantSettingsRepository.findByRestaurantId = original.settings;
  refundOrderPaymentService.execute = original.refund;
});
const input = {
  restaurantId: 7,
  intentId: 91,
  provider: 'MERCADO_PAGO',
  method: 'PIX',
  externalId: '1234',
  amountCents: 3000,
  expiresAt: new Date(),
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const mutation = { externalId: '1234', idempotencyKey: 'stable-key' };
function credentials() {
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return {
      mercadoPagoAccessToken: 'tenant-mp',
      asaasAccessToken: 'tenant-asaas',
    };
  };
}

test('MP: reusa estorno dos pedidos com tenant/chave estável e só confirma depois da consulta', async () => {
  credentials();
  let refunded = false;
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.mercadopago.com/v1/payments/1234');
    assert.equal(init.headers.Authorization, 'Bearer tenant-mp');
    return json({
      id: 1234,
      status: refunded ? 'refunded' : 'approved',
      transaction_amount: 30,
      currency_id: 'BRL',
    });
  };
  refundOrderPaymentService.execute = async (order, options) => {
    assert.equal(order.restaurantId, 7);
    assert.equal(order.pixPaymentId, '1234');
    assert.equal(options.idempotencyKey, 'stable-key');
    refunded = true;
    return { provider: 'MERCADO_PAGO', externalId: 'refund-1' };
  };
  assert.equal((await mutateDirectTablePayment(input, 'refund', mutation)).status, 'REFUNDED');
});

test('MP: cancelamento de pendente usa PUT e reconcilia estado confirmado', async () => {
  credentials();
  let canceled = false;
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'PUT') {
      assert.equal(JSON.parse(init.body).status, 'cancelled');
      canceled = true;
    }
    return json({
      id: 1234,
      status: canceled ? 'cancelled' : 'pending',
      transaction_amount: 30,
      currency_id: 'BRL',
    });
  };
  assert.equal((await mutateDirectTablePayment(input, 'cancel', mutation)).status, 'CANCELED');
});

test('MP Orders: reconcilia cartão da mesa pelo tenant, referência e valor corretos', async () => {
  credentials();
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.mercadopago.com/v1/orders/ORD_TABLE_91');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer tenant-mp');
    return json({
      id: 'ORD_TABLE_91',
      status: 'processed',
      external_reference: 'ordercard_91_7',
      total_amount: '30.00',
      total_paid_amount: '30.00',
      currency: 'BRL',
    });
  };

  const result = await getDirectTablePayment({
    ...input,
    method: 'CARD',
    externalId: 'mp_order:ORD_TABLE_91',
  });

  assert.equal(result?.status, 'PAID');
  assert.equal(result?.amountCents, 3000);
});

test('MP Orders: rejeita cobrança de outro tenant, referência ou valor', async () => {
  credentials();

  for (const remote of [
    {
      id: 'ORD_TABLE_91',
      status: 'processed',
      external_reference: 'ordercard_91_8',
      total_amount: '30.00',
      total_paid_amount: '30.00',
      currency: 'BRL',
    },
    {
      id: 'ORD_TABLE_91',
      status: 'processed',
      external_reference: 'ordercard_91_7',
      total_amount: '99.00',
      total_paid_amount: '99.00',
      currency: 'BRL',
    },
    {
      id: 'ORD_TABLE_91',
      status: 'processed',
      external_reference: 'ordercard_91_7',
      total_amount: '30.00',
      total_paid_amount: '30.00',
      currency: 'USD',
    },
  ]) {
    globalThis.fetch = async () => json(remote);
    await assert.rejects(
      () =>
        getDirectTablePayment({
          ...input,
          method: 'CARD',
          externalId: 'mp_order:ORD_TABLE_91',
        }),
      /não corresponde/,
    );
  }
});

test('MP Orders: cancelamento usa endpoint Orders e chave idempotente', async () => {
  credentials();
  let canceled = false;

  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/cancel')) {
      assert.equal(url, 'https://api.mercadopago.com/v1/orders/ORD_TABLE_91/cancel');
      assert.equal(init?.method, 'POST');
      assert.equal(new Headers(init?.headers).get('x-idempotency-key'), 'stable-key');
      canceled = true;
      return json({
        id: 'ORD_TABLE_91',
        status: 'canceled',
        external_reference: 'ordercard_91_7',
        total_amount: '30.00',
        total_paid_amount: '30.00',
        currency: 'BRL',
      });
    }

    assert.equal(url, 'https://api.mercadopago.com/v1/orders/ORD_TABLE_91');
    return json({
      id: 'ORD_TABLE_91',
      status: canceled ? 'canceled' : 'action_required',
      external_reference: 'ordercard_91_7',
      total_amount: '30.00',
      total_paid_amount: '30.00',
      currency: 'BRL',
    });
  };

  const result = await mutateDirectTablePayment(
    {
      ...input,
      method: 'CARD',
      externalId: 'mp_order:ORD_TABLE_91',
    },
    'cancel',
    mutation,
  );

  assert.equal(result.status, 'CANCELED');
});

test('checkout preference ambíguo nunca é convertido em estorno de outro pedido', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw Error();
  };
  await assert.rejects(
    () =>
      mutateDirectTablePayment(
        { ...input, method: 'CARD', externalId: 'mp_pref:preference' },
        'refund',
        mutation,
      ),
    /sem referência/,
  );
  assert.equal(calls, 0);
});

for (const bad of [
  { id: 9999, currency_id: 'BRL', transaction_amount: 30 },
  { id: 1234, currency_id: 'USD', transaction_amount: 30 },
  { id: 1234, currency_id: 'BRL', transaction_amount: 1 },
]) {
  test(`não estorna cobrança com evidência divergente ${JSON.stringify(bad)}`, async () => {
    credentials();
    globalThis.fetch = async () => json({ ...bad, status: 'approved' });
    refundOrderPaymentService.execute = async () => {
      assert.fail('não pode estornar');
    };
    await assert.rejects(
      () => mutateDirectTablePayment(input, 'refund', mutation),
      /não corresponde/,
    );
  });
}

test('Asaas: HTTP aceito com estorno pendente não vira REFUNDED', async () => {
  credentials();
  let requested = false;
  globalThis.fetch = async () =>
    json({
      id: 'pay_abc',
      status: requested ? 'REFUND_REQUESTED' : 'RECEIVED',
      value: 30,
      refunds: requested ? [{ status: 'PENDING', value: 30 }] : [],
    });
  refundOrderPaymentService.execute = async () => {
    requested = true;
    return { provider: 'ASAAS', externalId: 'pay_abc' };
  };
  const result = await mutateDirectTablePayment(
    { ...input, provider: 'ASAAS', externalId: 'asaas:pay_abc' },
    'refund',
    mutation,
  );
  assert.equal(result.status, 'PENDING');
});

test('Asaas: soma somente devoluções DONE, sem contar PENDING/CANCELLED', async () => {
  credentials();
  for (const done of [10, 30]) {
    globalThis.fetch = async () =>
      json({
        id: 'pay_abc',
        status: 'REFUNDED',
        value: 30,
        refunds: [
          { status: 'DONE', value: done },
          { status: 'CANCELLED', value: 20 },
          { status: 'PENDING', value: 20 },
        ],
      });
    assert.equal(
      (await getDirectTablePayment({ ...input, provider: 'ASAAS', externalId: 'asaas:pay_abc' }))
        .status,
      done === 30 ? 'REFUNDED' : 'PENDING',
    );
  }
});
