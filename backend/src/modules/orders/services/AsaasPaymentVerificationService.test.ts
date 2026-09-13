// @ts-nocheck
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import repository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import service from './AsaasPaymentVerificationService.js';

const originalFind = repository.findByRestaurantId;
const originalFetch = globalThis.fetch;
let payment;
let providerCalls;
const input = {
  restaurantId: 7,
  orderId: 91,
  total: 59.9,
  paymentId: 'pay_91',
  method: 'CARTAO',
  accountId: 'account-7',
};
beforeEach(() => {
  providerCalls = 0;
  payment = {
    id: 'pay_91',
    value: 59.9,
    externalReference: 'ordercard:91:7',
    status: 'CONFIRMED',
    billingType: 'CREDIT_CARD',
  };
  repository.findByRestaurantId = async (id) => {
    assert.equal(id, 7);
    return { asaasAccessToken: 'tenant-test-token', asaasAccountId: 'account-7' };
  };
  globalThis.fetch = async (url, init) => {
    providerCalls += 1;
    assert.equal(new URL(String(url)).pathname, '/v3/payments/pay_91');
    assert.equal(init.headers.access_token, 'tenant-test-token');
    return new Response(JSON.stringify(payment), { status: 200 });
  };
});
afterEach(() => {
  repository.findByRestaurantId = originalFind;
  globalThis.fetch = originalFetch;
});

test('cartão CONFIRMED é pagamento aprovado, consultado com token do próprio restaurante', async () => {
  assert.equal((await service.execute(input)).approved, true);
  assert.equal(providerCalls, 1);
});
test('conta de outro restaurante é recusada antes de consultar provedor', async () => {
  assert.equal(await service.execute({ ...input, accountId: 'other-account' }), null);
  assert.equal(providerCalls, 0);
});
for (const [field, value] of [
  ['id', 'pay_other'],
  ['value', 60],
  ['externalReference', 'ordercard:91:8'],
  ['billingType', 'RECEIVED_IN_CASH'],
]) {
  test(`não confirma divergência em ${field}`, async () => {
    payment[field] = value;
    assert.equal(await service.execute(input), null);
  });
}
test('webhook não confirma cobrança ainda pendente no provedor', async () => {
  payment.status = 'PENDING';
  assert.equal((await service.execute(input)).approved, false);
});
test('evento de exclusão não basta sem exclusão confirmada no provedor', async () => {
  payment.status = 'PENDING';
  assert.equal((await service.execute(input)).terminalUnpaid, false);
  payment.deleted = true;
  assert.equal((await service.execute(input)).terminalUnpaid, true);
});
test('Pix consulta referência e tipo do pagamento corretos', async () => {
  payment.externalReference = 'orderpix:7:91';
  payment.billingType = 'PIX';
  payment.status = 'RECEIVED';
  assert.equal((await service.execute({ ...input, method: 'PIX' })).approved, true);
});
test('falha do provedor não é convertida em confirmação', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  await assert.rejects(service.execute(input), /temporariamente indisponível/);
});
