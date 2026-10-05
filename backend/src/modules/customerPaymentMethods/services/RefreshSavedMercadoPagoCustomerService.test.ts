import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import {
  refreshSavedMercadoPagoCustomer,
  SavedMercadoPagoCustomerRefreshError,
} from './RefreshSavedMercadoPagoCustomerService.js';

const input = {
  accessToken: 'TEST-provider-credential',
  customerId: 'customer-1',
  cardId: 'card-1',
  expectedBrand: 'mastercard',
  expectedLast4: '0829',
  verifiedPayer: { name: 'Cliente de Teste', email: 'payer@example.test', cpf: '123.456.789-01' },
};
const baseCard = {
  id: 'card-1',
  customer_id: 'customer-1',
  last_four_digits: '0829',
  payment_method: { id: 'master' },
  cardholder: {
    name: 'Outra Pessoa Titular',
    identification: { type: 'CPF', number: '999.888.777-66' },
  },
};

function provider(t: TestContext, customer: Record<string, unknown>, card = baseCard) {
  customer.email ??= input.verifiedPayer.email;
  const updates: Record<string, unknown>[] = [];
  const calls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request, init: RequestInit) => {
    const path = new URL(String(url)).pathname;
    assert.equal(new URL(String(url)).origin, 'https://api.mercadopago.com');
    assert.equal(new Headers(init.headers).get('authorization'), `Bearer ${input.accessToken}`);
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    calls.push(`${init.method} ${path}`);
    if (path.endsWith('/cards/card-1')) {
      assert.equal(init.method, 'GET');
      return Response.json(card);
    }
    assert.equal(path, '/v1/customers/customer-1');
    if (init.method === 'PUT') {
      const update = JSON.parse(String(init.body));
      updates.push(update);
      Object.assign(customer, update);
    } else assert.equal(init.method, 'GET');
    return Response.json(customer);
  });
  return { updates, calls };
}

test('completa nome/CPF do perfil verificado antes de pagar e não repete PUT quando atualizados', async (t) => {
  const customer = { id: 'customer-1', email: 'payer@example.test' };
  const { updates, calls } = provider(t, customer);
  await refreshSavedMercadoPagoCustomer(input);
  assert.deepEqual(updates, [
    {
      first_name: 'Cliente de Teste',
      identification: { type: 'CPF', number: '12345678901' },
    },
  ]);
  assert.deepEqual(calls.slice(0, 3), [
    'GET /v1/customers/customer-1',
    'GET /v1/customers/customer-1/cards/card-1',
    'PUT /v1/customers/customer-1',
  ]);
  await refreshSavedMercadoPagoCustomer(input);
  assert.equal(updates.length, 1);
  assert.equal(customer.email, 'payer@example.test');
  assert.equal(JSON.stringify(updates).includes('securityCode'), false);
  assert.equal(JSON.stringify(updates).includes(input.accessToken), false);
});

test('completa CPF ausente quando o nome remoto corresponde ao perfil verificado', async (t) => {
  const { updates } = provider(t, {
    id: 'customer-1',
    first_name: 'CLIENTE',
    last_name: 'de Teste',
    identification: { type: 'CPF', number: null },
  });
  await refreshSavedMercadoPagoCustomer(input);
  assert.deepEqual(updates, [{ identification: { type: 'CPF', number: '12345678901' } }]);
});

test('preserva identidade preenchida, email, telefone e endereço do comprador', async (t) => {
  const customer = {
    id: 'customer-1',
    email: 'payer@example.test',
    first_name: 'Outro Comprador',
    identification: { type: 'CPF', number: '98765432100' },
    phone: { area_code: '11', number: '999999999' },
    address: { zip_code: '01001000' },
  };
  const original = structuredClone(customer);
  const { updates } = provider(t, customer);
  await refreshSavedMercadoPagoCustomer(input);
  assert.deepEqual(updates, []);
  assert.deepEqual(customer, original);
});

test('não atribui o CPF do perfil a um comprador de nome diferente', async (t) => {
  const { updates } = provider(t, { id: 'customer-1', first_name: 'Outro Comprador' });
  await refreshSavedMercadoPagoCustomer(input);
  assert.deepEqual(updates, []);
});

test('não atribui nome do perfil a um comprador com documento diferente', async (t) => {
  const { updates } = provider(t, {
    id: 'customer-1',
    identification: { type: 'CPF', number: '98765432100' },
  });
  await refreshSavedMercadoPagoCustomer(input);
  assert.deepEqual(updates, []);
});

for (const patch of [
  { id: 'another-card' },
  { customer_id: 'another-customer' },
  { last_four_digits: '9999' },
  { payment_method: { id: 'visa' } },
]) {
  test(`recusa referência inconsistente sem atualizar cadastro: ${JSON.stringify(patch)}`, async (t) => {
    const { updates } = provider(t, { id: 'customer-1' }, { ...baseCard, ...patch });
    await assert.rejects(
      refreshSavedMercadoPagoCustomer(input),
      (error) =>
        error instanceof SavedMercadoPagoCustomerRefreshError &&
        error.code === 'saved_card_reference_mismatch',
    );
    assert.deepEqual(updates, []);
  });
}

test('não transforma documento mascarado em CPF nem preenche com dados inventados', async (t) => {
  const { updates } = provider(t, { id: 'customer-1', first_name: 'Cliente de Teste' });
  await refreshSavedMercadoPagoCustomer({
    ...input,
    verifiedPayer: { ...input.verifiedPayer, cpf: '***45678901' },
  });
  assert.deepEqual(updates, []);
});

test('suporta CNPJ informado no perfil autenticado', async (t) => {
  const { updates } = provider(t, { id: 'customer-1', first_name: 'Cliente de Teste' });
  await refreshSavedMercadoPagoCustomer({
    ...input,
    verifiedPayer: { ...input.verifiedPayer, cpf: '12.345.678/0001-95' },
  });
  assert.deepEqual(updates, [{ identification: { type: 'CNPJ', number: '12345678000195' } }]);
});

test('sem vínculo de email verificado não altera customer mesmo com titular disponível', async (t) => {
  const { updates } = provider(t, { id: 'customer-1' });
  await refreshSavedMercadoPagoCustomer({ ...input, verifiedPayer: null });
  assert.deepEqual(updates, []);
});

test('bloqueia customer legado cujo email difere da conta verificada', async (t) => {
  const { updates } = provider(t, { id: 'customer-1', email: 'outra-conta@example.test' });
  await assert.rejects(
    refreshSavedMercadoPagoCustomer(input),
    (error) =>
      error instanceof SavedMercadoPagoCustomerRefreshError &&
      error.code === 'saved_card_email_mismatch' &&
      error.httpStatus === 409,
  );
  assert.deepEqual(updates, []);
});

test('não usa titular como substituto de perfil vazio', async (t) => {
  const { updates } = provider(t, { id: 'customer-1' });
  await refreshSavedMercadoPagoCustomer({
    ...input,
    verifiedPayer: { ...input.verifiedPayer, name: '', cpf: null },
  });
  assert.deepEqual(updates, []);
});

test('não expõe corpo de erro do provedor nem detalhes de rede', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      {
        message: 'sensitive-provider-body',
        token: input.accessToken,
      },
      { status: 503 },
    ),
  );
  await assert.rejects(refreshSavedMercadoPagoCustomer(input), (error) => {
    assert.ok(error instanceof SavedMercadoPagoCustomerRefreshError);
    assert.equal(error.code, 'saved_card_refresh_failed');
    assert.equal(error.httpStatus, 503);
    assert.equal(JSON.stringify(error).includes('sensitive-provider-body'), false);
    return true;
  });
});

test('timeout de atualização não vira recusa do cartão', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new DOMException('sensitive network details', 'TimeoutError');
  });
  await assert.rejects(
    refreshSavedMercadoPagoCustomer(input),
    (error) =>
      error instanceof SavedMercadoPagoCustomerRefreshError &&
      error.code === 'saved_card_refresh_unavailable',
  );
});
