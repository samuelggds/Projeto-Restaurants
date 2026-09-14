// @ts-nocheck
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import controller from './MercadoPagoPointWebhookController.js';
import repository from '../repositories/PaymentTerminalRepository.js';
import delivery from '../services/PaymentTerminalService.js';
import pickup from '../../pickupPayments/services/PickupPaymentService.js';

const original = {
  lookup: repository.findByProviderOrderId,
  pickup: pickup.reconcilePointWebhook,
  delivery: delivery.reconcilePointOrder,
  secret: process.env.MP_WEBHOOK_SECRET,
  secrets: process.env.MP_WEBHOOK_SECRETS,
};
afterEach(() => {
  repository.findByProviderOrderId = original.lookup;
  pickup.reconcilePointWebhook = original.pickup;
  delivery.reconcilePointOrder = original.delivery;
  for (const [name, value] of [
    ['MP_WEBHOOK_SECRET', original.secret],
    ['MP_WEBHOOK_SECRETS', original.secrets],
  ]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

async function invoke(valid = true) {
  process.env.MP_WEBHOOK_SECRET = 'point-webhook-unit-secret';
  delete process.env.MP_WEBHOOK_SECRETS;
  const hash = createHmac('sha256', valid ? process.env.MP_WEBHOOK_SECRET : 'invalid')
    .update('id:point-91;request-id:point-test;ts:1742505638;')
    .digest('hex');
  const req = {
    headers: { 'x-request-id': 'point-test', 'x-signature': `ts=1742505638,v1=${hash}` },
    query: { 'data.id': 'point-91' },
    body: { data: { id: 'point-91' } },
  };
  let status = 0;
  const res = {
    status(code) {
      status = code;
      return res;
    },
    json() {
      return res;
    },
    sendStatus(code) {
      status = code;
      return res;
    },
  };
  await controller.handle(req, res);
  return status;
}

test('Point autenticado encaminha retirada sem passar pelas regras de entrega', async () => {
  const payment = {
    orderId: 91,
    restaurantId: 7,
    method: 'CARTAO',
    provider: 'MERCADO_PAGO',
    providerOrderId: 'point-91',
  };
  repository.findByProviderOrderId = async (provider, id) => {
    assert.equal(provider, 'MERCADO_PAGO');
    assert.equal(id, 'point-91');
    return payment;
  };
  pickup.reconcilePointWebhook = async (input) => {
    assert.equal(input, payment);
    return true;
  };
  delivery.reconcilePointOrder = async () => {
    assert.fail('Retirada não pode ser encaminhada para entrega.');
  };
  assert.equal(await invoke(), 200);
});

test('Point de entrega preserva o reconciliador anterior', async () => {
  repository.findByProviderOrderId = async () => ({ orderId: 91, restaurantId: 7 });
  pickup.reconcilePointWebhook = async () => false;
  let calls = 0;
  delivery.reconcilePointOrder = async (id, restaurantId) => {
    calls++;
    assert.deepEqual([id, restaurantId], ['point-91', 7]);
  };
  assert.equal(await invoke(), 200);
  assert.equal(calls, 1);
});

test('assinatura inválida não consulta nem reconcilia pagamentos', async () => {
  repository.findByProviderOrderId = async () => {
    assert.fail('Não deve consultar banco.');
  };
  assert.equal(await invoke(false), 401);
});

test('falha de conciliação retorna 500 sem divulgar mensagem do provedor', async () => {
  repository.findByProviderOrderId = async () => ({ orderId: 91, restaurantId: 7 });
  pickup.reconcilePointWebhook = async () => {
    throw new Error('provider-private-token');
  };
  const logs = [];
  const log = console.error;
  console.error = (...args) => {
    logs.push(args);
  };
  try {
    assert.equal(await invoke(), 500);
    assert.equal(JSON.stringify(logs).includes('provider-private-token'), false);
  } finally {
    console.error = log;
  }
});
