// @ts-nocheck
import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import settings from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import {
  createPagBankCheckout,
  getPagBankCheckoutPayment,
  getPagBankCardChargePayment,
  refundPagBankCardCharge,
} from './pagBankCheckout.js';

const original = { settings: settings.findByRestaurantId, fetch: globalThis.fetch };
const reference = 'ordercard:91:7:123e4567e89b42d3a456426614174001';
const input = { restaurantId: 7, checkoutId: 'CHEC_91', reference, amountCents: 2500 };
const charge = () => ({
  id: 'CHAR_91',
  reference_id: 'pagbank-generated-charge-reference',
  status: 'PAID',
  amount: { value: 2500, currency: 'BRL', summary: { paid: 2500, refunded: 0 } },
  payment_method: { type: 'CREDIT_CARD' },
});
const checkout = () => ({ id: 'CHEC_91', reference_id: reference, status: 'ACTIVE' });
const paymentOrder = () => ({ id: 'ORDE_91', reference_id: reference, charges: [charge()] });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  settings.findByRestaurantId = async (restaurantId) => {
    assert.equal(restaurantId, 7);
    return { restaurantId: 7, pagbankToken: 'token-restaurant-7' };
  };
});
afterEach(() => {
  settings.findByRestaurantId = original.settings;
  globalThis.fetch = original.fetch;
});

test('Connect cria checkout Bearer sem email legado e configura ambas notificações', async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.pagseguro.com/checkouts');
    assert.equal(init.headers.Authorization, 'Bearer token-restaurant-7');
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    const body = JSON.parse(init.body);
    assert.equal(body.reference_id, reference);
    assert.equal(body.items[0].unit_amount, 2500);
    assert.deepEqual(body.payment_methods, [{ type: 'CREDIT_CARD' }]);
    assert.deepEqual(body.payment_notification_urls, [
      'https://api.gastronexa.com.br/orders/webhook/pagbank?restaurantId=7',
    ]);
    assert.deepEqual(body.notification_urls, body.payment_notification_urls);
    assert.equal(body.email, undefined);
    assert.equal(body.token, undefined);
    return json({
      ...checkout(),
      links: [{ rel: 'PAY', href: 'https://pagamento.pagbank.com.br/pagamento?code=91' }],
    });
  };
  const result = await createPagBankCheckout({
    ...input,
    title: 'Pedido #91',
    redirectUrl: 'https://gastronexa.com.br/pedidos',
    notificationUrl: 'https://api.gastronexa.com.br/orders/webhook/pagbank?restaurantId=7',
  });
  assert.equal(result.id, 'CHEC_91');
});

test('não redireciona o cliente para link de pagamento externo adulterado', async () => {
  globalThis.fetch = async () =>
    json({ ...checkout(), links: [{ rel: 'PAY', href: 'https://evil.example/pagamento' }] });
  await assert.rejects(
    () =>
      createPagBankCheckout({
        ...input,
        title: 'Pedido',
        redirectUrl: 'https://gastronexa.com.br',
        notificationUrl: '',
      }),
    /não corresponde/,
  );
});

test('webhook Orders oficial concilia checkout salvo e charge com referência própria do PagBank', async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, init) => {
    calls.push(url);
    assert.equal(init.headers.Authorization, 'Bearer token-restaurant-7');
    return json(String(url).includes('/checkouts/') ? checkout() : paymentOrder());
  };
  assert.deepEqual(await getPagBankCheckoutPayment({ ...input, orderId: 'ORDE_91' }), {
    status: 'PAID',
    chargeId: 'CHAR_91',
  });
  assert.equal(calls.length, 2);
  assert.match(calls[0], /checkouts\/CHEC_91/);
  assert.match(calls[1], /orders\/ORDE_91/);
});

for (const [label, change] of [
  [
    'outro checkout',
    (c, o) => {
      c.id = 'CHEC_outra';
    },
  ],
  [
    'outro restaurante na referência',
    (c, o) => {
      o.reference_id = reference.replace(':7:', ':8:');
    },
  ],
  [
    'outro pedido no gateway',
    (c, o) => {
      o.id = 'ORDE_outra';
    },
  ],
  [
    'valor divergente',
    (c, o) => {
      o.charges[0].amount.value = 1;
    },
  ],
  [
    'moeda divergente',
    (c, o) => {
      o.charges[0].amount.currency = 'USD';
    },
  ],
  [
    'charge sem id',
    (c, o) => {
      delete o.charges[0].id;
    },
  ],
]) {
  test(`não confirma ${label}`, async () => {
    const c = checkout(),
      o = paymentOrder();
    change(c, o);
    globalThis.fetch = async (url) => json(String(url).includes('/checkouts/') ? c : o);
    await assert.rejects(() => getPagBankCheckoutPayment({ ...input, orderId: 'ORDE_91' }));
  });
}

test('checkout ACTIVE sem pagamento continua pendente e EXPIRED nunca vira pago', async () => {
  const body = checkout();
  globalThis.fetch = async () => json(body);
  assert.equal((await getPagBankCheckoutPayment(input)).status, 'PENDING');
  body.status = 'EXPIRED';
  assert.equal((await getPagBankCheckoutPayment(input)).status, 'EXPIRED');
});

test('consulta só reconhece a charge previamente vinculada ao pedido', async () => {
  globalThis.fetch = async () => json({ ...charge(), id: 'CHAR_outro' });
  await assert.rejects(
    () => getPagBankCardChargePayment({ ...input, chargeId: 'CHAR_91' }),
    /não pertence/,
  );
});

test('checkout sem notificação Orders não confirma por coleções de contrato não verificado', async () => {
  globalThis.fetch = async () =>
    json({ ...checkout(), orders: [paymentOrder()], payments: [paymentOrder()] });
  assert.deepEqual(await getPagBankCheckoutPayment(input), { status: 'PENDING', chargeId: null });
});

test('checkout aceita Pagar com PagBank capturado, sem restringir a carteira a cartão', async () => {
  const payment = paymentOrder();
  payment.charges[0].payment_method.type = 'PAGBANK_WALLET';
  globalThis.fetch = async (url) =>
    json(String(url).includes('/checkouts/') ? checkout() : payment);
  assert.deepEqual(await getPagBankCheckoutPayment({ ...input, orderId: 'ORDE_91' }), {
    status: 'PAID',
    chargeId: 'CHAR_91',
  });
  globalThis.fetch = async () => json(payment.charges[0]);
  assert.equal(
    (
      await getPagBankCardChargePayment({
        ...input,
        reference: undefined,
        chargeId: 'CHAR_91',
        hostedCheckout: true,
      })
    ).status,
    'PAID',
  );
  await assert.rejects(
    () =>
      getPagBankCardChargePayment({
        ...input,
        reference: payment.charges[0].reference_id,
        chargeId: 'CHAR_91',
      }),
    /dados financeiros/,
  );
});

test('cobrança da carteira confirmada no checkout também permite estorno integral', async () => {
  let posts = 0;
  globalThis.fetch = async (_url, init) => {
    const body = charge();
    body.payment_method.type = 'PAGBANK_WALLET';
    if (init.method === 'POST') {
      posts++;
      body.status = 'CANCELED';
      body.amount.summary.refunded = 2500;
    }
    return json(body);
  };
  assert.equal(
    await refundPagBankCardCharge({ ...input, chargeId: 'CHAR_91', hostedCheckout: true }),
    'CHAR_91',
  );
  assert.equal(posts, 1);
});

test('estorno moderno usa charge/cancel, Bearer tenant, valor e idempotência sem email legado', async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.headers.Authorization, 'Bearer token-restaurant-7');
    return json(
      calls.length === 1
        ? charge()
        : {
            ...charge(),
            status: 'CANCELED',
            amount: { value: 2500, currency: 'BRL', summary: { refunded: 2500 } },
          },
    );
  };
  assert.equal(
    await refundPagBankCardCharge({ ...input, chargeId: 'CHAR_91', idempotencyKey: 'refund-91' }),
    'CHAR_91',
  );
  assert.match(calls[1].url, /charges\/CHAR_91\/cancel$/);
  assert.equal(calls[1].init.headers['x-idempotency-key'], 'refund-91');
  assert.deepEqual(JSON.parse(calls[1].init.body), { amount: { value: 2500 } });
});

test('estorno não é declarado concluído por HTTP 200 sem confirmação da devolução', async () => {
  globalThis.fetch = async () => json(charge());
  await assert.rejects(
    () => refundPagBankCardCharge({ ...input, chargeId: 'CHAR_91' }),
    /ainda não confirmou/,
  );
});
