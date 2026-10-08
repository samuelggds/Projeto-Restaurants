// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import service from './RecoverUnknownCardPaymentService.js';
import orderPaymentAttemptRepository from '../repositories/OrderPaymentAttemptRepository.js';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { mercadoPagoCardAttemptExternalReference } from '../domain/mercadoPagoCardReference.js';
import getOrderCardPaymentStatusService from './GetOrderCardPaymentStatusService.js';
import finalizeOrderCardPaymentService from './FinalizeOrderCardPaymentService.js';
import orderRepository from '../repositories/OrderRepository.js';

const order = { id: 91, restaurantId: 7, total: 25 };
const attempt = {
  id: 3,
  orderId: 91,
  restaurantId: 7,
  provider: 'MERCADO_PAGO',
  publicId: '123e4567-e89b-42d3-a456-426614174001',
  amount: 25,
  status: 'PROCESSING',
  providerOrderId: null,
  createdAt: new Date(Date.now() - 90_000),
};
const reference = mercadoPagoCardAttemptExternalReference(91, 7, attempt.publicId);
const canonical = {
  id: 'ORD-RECOVERED',
  type: 'online',
  external_reference: reference,
  total_amount: '25.00',
  total_paid_amount: '25.00',
  currency: 'BRL',
  status: 'processed',
};

function fixture(
  t,
  {
    results = [canonical],
    remote = canonical,
    total = results.length,
    bound = true,
    count = 2,
  } = {},
) {
  t.mock.method(restaurantSettingsRepository, 'findByRestaurantId', async (tenant) => {
    assert.equal(tenant, 7);
    return {
      mercadoPagoAccessToken: 'test-tenant-token',
      mercadoPagoRefreshToken: 'test-refresh',
      mercadoPagoTokenExpiresAt: new Date(Date.now() + 3600000),
    };
  });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(init.method, 'GET');
    assert.equal(init.body, undefined);
    assert.equal(init.headers.Authorization, 'Bearer test-tenant-token');
    assert.equal(init.redirect, 'error');
    if (url.pathname === '/v1/orders') {
      assert.equal(url.searchParams.get('external_reference'), reference);
      assert.equal(url.searchParams.get('type'), 'online');
      assert.equal(url.searchParams.get('page_size'), '2');
      assert.equal(
        url.searchParams.get('begin_date'),
        new Date(attempt.createdAt.getTime() - 60000).toISOString(),
      );
      assert.ok(url.searchParams.has('end_date'));
      return Response.json({ data: results, paging: { total } });
    }
    assert.equal(url.pathname, '/v1/orders/ORD-RECOVERED');
    return Response.json(remote);
  });
  t.mock.method(orderPaymentAttemptRepository, 'countForOrder', async () => count);
  const binding = t.mock.method(
    orderPaymentAttemptRepository,
    'bindRecoveredProviderOrder',
    async (value) => {
      assert.deepEqual(value, {
        orderId: 91,
        restaurantId: 7,
        attemptId: 3,
        providerOrderId: 'ORD-RECOVERED',
        amount: 25,
      });
      return bound;
    },
  );
  return { calls, binding };
}

test('recupera vínculo após crash entre persistir id remoto e atualizar o pedido', async (t) => {
  const state = fixture(t);
  assert.deepEqual(
    await service.execute(order, { ...attempt, providerOrderId: canonical.id }),
    canonical,
  );
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].pathname, '/v1/orders/ORD-RECOVERED');
});

test('não busca credenciais nem consulta provedor para tentativa de outro tenant', async (t) => {
  const state = fixture(t);
  assert.equal(await service.execute(order, { ...attempt, restaurantId: 8 }), null);
  assert.equal(state.calls.length, 0);
});

test('legado sem referência por tentativa só é associado quando busca e tentativa local são únicas', async (t) => {
  const state = fixture(t, { count: 1 });
  const legacy = { ...canonical, external_reference: 'ordercard_91_7' };
  const requestedReferences = [];
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    const url = new URL(String(input));
    assert.equal(init.method, 'GET');
    if (url.pathname === '/v1/orders') {
      const requested = url.searchParams.get('external_reference');
      requestedReferences.push(requested);
      return Response.json({
        data: requested === reference ? [] : [legacy],
        paging: { total: requested === reference ? 0 : 1 },
      });
    }
    return Response.json(legacy);
  });
  assert.deepEqual(await service.execute(order, attempt), legacy);
  assert.deepEqual(requestedReferences, [reference, 'ordercard_91_7']);
  assert.equal(state.binding.mock.callCount(), 1);
});

test('erro de rede na recuperação mantém status pendente e nunca finaliza pagamento', async (t) => {
  fixture(t);
  const publicId = '123e4567-e89b-42d3-a456-426614174002';
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('synthetic timeout');
  });
  t.mock.method(orderRepository, 'findCardPaymentStatusByPublicId', async () => ({
    ...order,
    publicId,
    userId: 17,
    type: 'DELIVERY',
    paymentMethod: 'CARTAO',
    paid: false,
    status: 'PENDENTE',
    cardCheckoutSessionId: null,
    kitchenPrintJobs: [],
  }));
  t.mock.method(orderPaymentAttemptRepository, 'latestForOrder', async () => attempt);
  const finalize = t.mock.method(finalizeOrderCardPaymentService, 'execute', async () => {
    throw new Error('Não confirmar sem evidência.');
  });
  const result = await getOrderCardPaymentStatusService.execute({
    orderPublicId: publicId,
    restaurantId: 7,
    userId: 17,
  });
  assert.equal(result.status, 'PENDING');
  assert.equal(result.reconciliationPending, true);
  assert.equal(finalize.mock.callCount(), 0);
});

test('resposta perdida é recuperada por GET autenticado, referência exata e vínculo CAS', async (t) => {
  const state = fixture(t);
  assert.deepEqual(await service.execute(order, attempt), canonical);
  assert.equal(state.calls.length, 2);
  assert.equal(state.binding.mock.callCount(), 1);
});

for (const [name, options] of [
  ['busca vazia', { results: [] }],
  ['resultados múltiplos', { results: [canonical, { ...canonical, id: 'ORD-SECOND' }] }],
  ['página incompleta', { total: 3 }],
  [
    'tenant incorreto',
    { remote: { ...canonical, external_reference: reference.replace('_91_7_', '_91_8_') } },
  ],
  [
    'tentativa incorreta',
    { remote: { ...canonical, external_reference: reference.replace(/.$/, '2') } },
  ],
  ['valor incorreto', { remote: { ...canonical, total_amount: '1.00' } }],
  ['moeda incorreta', { remote: { ...canonical, currency: 'USD' } }],
  ['moeda ausente', { remote: { ...canonical, currency: undefined } }],
  ['recurso diferente', { remote: { ...canonical, id: 'ORD-OTHER' } }],
]) {
  test(`não vincula pagamento com ${name}`, async (t) => {
    const state = fixture(t, options);
    assert.equal(await service.execute(order, attempt), null);
    assert.equal(state.binding.mock.callCount(), 0);
  });
}

test('replay concorrente que perde o CAS não confirma pagamento', async (t) => {
  fixture(t, { bound: false });
  assert.equal(await service.execute(order, attempt), null);
});

for (const status of ['PENDENTE', 'CANCELADO']) {
  test(`status recupera aprovação tardia de pedido ${status} e usa finalização canônica`, async (t) => {
    fixture(t);
    const publicId = '123e4567-e89b-42d3-a456-426614174002';
    t.mock.method(orderRepository, 'findCardPaymentStatusByPublicId', async () => ({
      ...order,
      publicId,
      userId: 17,
      type: 'DELIVERY',
      paymentMethod: 'CARTAO',
      paid: false,
      status,
      cardCheckoutSessionId: null,
      kitchenPrintJobs: [],
    }));
    t.mock.method(orderPaymentAttemptRepository, 'latestForOrder', async () => attempt);
    t.mock.method(orderPaymentAttemptRepository, 'update', async (_id, _tenant, next, data) => ({
      ...attempt,
      ...data,
      status: next,
    }));
    const finalize = t.mock.method(finalizeOrderCardPaymentService, 'execute', async (input) => {
      assert.deepEqual(input, {
        orderId: 91,
        restaurantId: 7,
        checkoutSessionId: 'mp_order:ORD-RECOVERED',
      });
      return { paid: status !== 'CANCELADO', status };
    });
    const result = await getOrderCardPaymentStatusService.execute({
      orderPublicId: publicId,
      restaurantId: 7,
      userId: 17,
    });
    assert.equal(finalize.mock.callCount(), 1);
    assert.equal(result.paid, status !== 'CANCELADO');
    assert.equal(result.status, status === 'CANCELADO' ? 'CANCELED' : 'PAID');
  });
}
