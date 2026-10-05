import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import {
  buildMercadoPagoCustomerPayload,
  mercadoPagoCustomer,
} from './CustomerPaymentMethodRoutes.js';

const providerBaseUrl = 'https://mercadopago.example.test';
const providerToken = 'synthetic-test-token';
const syntheticCustomerId = 'synthetic-customer-1';

type CustomerApiCall = {
  method: string;
  path: string;
  body?: Record<string, unknown>;
};

function mockCustomerApi(t: TestContext, customers: Array<Record<string, unknown>>) {
  const calls: CustomerApiCall[] = [];
  t.mock.method(
    globalThis,
    'fetch',
    async (input: string | URL | Request, init: RequestInit = {}) => {
      const url = new URL(String(input));
      assert.equal(url.origin, providerBaseUrl);
      assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${providerToken}`);
      const method = String(init.method || 'GET').toUpperCase();
      const body = init.body
        ? (JSON.parse(String(init.body)) as Record<string, unknown>)
        : undefined;
      calls.push({ method, path: `${url.pathname}${url.search}`, ...(body ? { body } : {}) });

      if (method === 'GET' && url.pathname === '/v1/customers/search') {
        assert.equal(url.searchParams.get('email'), 'buyer@example.test');
        return new Response(JSON.stringify({ results: customers }), { status: 200 });
      }
      if (method === 'POST' && url.pathname === '/v1/customers') {
        return new Response(JSON.stringify({ id: syntheticCustomerId, ...body }), { status: 201 });
      }
      if (method === 'PUT' && url.pathname === `/v1/customers/${syntheticCustomerId}`) {
        return new Response(JSON.stringify({ ...customers[0], ...body }), { status: 200 });
      }
      assert.fail(`Unexpected synthetic customer API request: ${method} ${url.pathname}`);
    },
  );
  return calls;
}

test('usa o e-mail informado pelo comprador ao criar customer do Mercado Pago', () => {
  const payload = buildMercadoPagoCustomerPayload({
    name: 'Samuel Gomes',
    payerEmail: 'comprador@example.com',
    holderTaxId: '123.456.789-01',
  });

  assert.equal(payload.email, 'comprador@example.com');
  assert.equal(payload.first_name, 'Samuel Gomes');
  assert.deepEqual(payload.identification, {
    type: 'CPF',
    number: '12345678901',
  });
});

test('não substitui o e-mail do comprador por identidade de login', () => {
  const payload = buildMercadoPagoCustomerPayload({
    name: 'Cliente Google',
    payerEmail: 'pagador-cartao@example.com',
    holderTaxId: '12.345.678/0001-95',
  });

  assert.equal(payload.email, 'pagador-cartao@example.com');
  assert.deepEqual(payload.identification, {
    type: 'CNPJ',
    number: '12345678000195',
  });
});

test('caracteriza customer legado: dados novos são descartados ao reutilizar resultado por e-mail', async (t) => {
  const existing = { id: syntheticCustomerId, email: 'buyer@example.test' };
  const calls = mockCustomerApi(t, [existing]);
  const id = await mercadoPagoCustomer(providerBaseUrl, providerToken, {
    name: 'Comprador de Teste',
    payerEmail: 'buyer@example.test',
    holderTaxId: '123.456.789-01',
  });

  assert.equal(id, syntheticCustomerId);
  assert.deepEqual(
    calls.map((call) => call.method),
    ['GET'],
  );
  assert.deepEqual(existing, { id: syntheticCustomerId, email: 'buyer@example.test' });
});

test('cria customer novo com o nome e documento informados', async (t) => {
  const calls = mockCustomerApi(t, []);
  const id = await mercadoPagoCustomer(providerBaseUrl, providerToken, {
    name: 'Comprador de Teste',
    payerEmail: 'buyer@example.test',
    holderTaxId: '123.456.789-01',
  });

  assert.equal(id, syntheticCustomerId);
  assert.deepEqual(calls, [
    { method: 'GET', path: '/v1/customers/search?email=buyer%40example.test' },
    {
      method: 'POST',
      path: '/v1/customers',
      body: {
        email: 'buyer@example.test',
        first_name: 'Comprador de Teste',
        identification: { type: 'CPF', number: '12345678901' },
      },
    },
  ]);
});

test('reutiliza customer com a mesma identidade sem atualização desnecessária', async (t) => {
  const calls = mockCustomerApi(t, [
    {
      id: syntheticCustomerId,
      email: 'buyer@example.test',
      first_name: 'Comprador de Teste',
      identification: { type: 'CPF', number: '12345678901' },
    },
  ]);
  const id = await mercadoPagoCustomer(providerBaseUrl, providerToken, {
    name: 'Comprador de Teste',
    payerEmail: 'buyer@example.test',
    holderTaxId: '123.456.789-01',
  });

  assert.equal(id, syntheticCustomerId);
  assert.deepEqual(
    calls.map((call) => call.method),
    ['GET'],
  );
});

test('não altera identidade divergente de customer encontrado somente por e-mail', async (t) => {
  const calls = mockCustomerApi(t, [
    {
      id: syntheticCustomerId,
      email: 'buyer@example.test',
      first_name: 'Outro Comprador',
      identification: { type: 'CPF', number: '98765432100' },
    },
  ]);
  await mercadoPagoCustomer(providerBaseUrl, providerToken, {
    name: 'Comprador de Teste',
    payerEmail: 'buyer@example.test',
    holderTaxId: '123.456.789-01',
  });

  assert.deepEqual(
    calls.map((call) => call.method),
    ['GET'],
  );
});

test('não apaga documento existente quando nenhum documento novo foi informado', async (t) => {
  const calls = mockCustomerApi(t, [
    {
      id: syntheticCustomerId,
      email: 'buyer@example.test',
      first_name: 'Comprador de Teste',
      identification: { type: 'CPF', number: '12345678901' },
    },
  ]);
  await mercadoPagoCustomer(providerBaseUrl, providerToken, {
    name: 'Comprador de Teste',
    payerEmail: 'buyer@example.test',
  });

  assert.deepEqual(
    calls.map((call) => call.method),
    ['GET'],
  );
});
