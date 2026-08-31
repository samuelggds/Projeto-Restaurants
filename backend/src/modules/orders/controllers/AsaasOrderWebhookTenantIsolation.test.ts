// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import controller from './AsaasOrderWebhookController.js';

const originals = {
  findOrder: prisma.order.findFirst,
  updateOrder: prisma.order.update,
  webhookToken: process.env.ASAAS_WEBHOOK_TOKEN,
};

afterEach(() => {
  prisma.order.findFirst = originals.findOrder;
  prisma.order.update = originals.updateOrder;
  if (originals.webhookToken === undefined) delete process.env.ASAAS_WEBHOOK_TOKEN;
  else process.env.ASAAS_WEBHOOK_TOKEN = originals.webhookToken;
});

function createResponse() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test('webhook Asaas não combina orderId real do Restaurante B com restaurantId do Restaurante A', async () => {
  process.env.ASAAS_WEBHOOK_TOKEN = 'webhook-test-token';
  const foreignOrder = { id: 91, restaurantId: 8 };
  let capturedQuery;
  let updateCalls = 0;
  prisma.order.findFirst = async (args) => {
    capturedQuery = args;
    return args.where.id === foreignOrder.id && args.where.restaurantId === foreignOrder.restaurantId
      ? foreignOrder
      : null;
  };
  prisma.order.update = async () => {
    updateCalls += 1;
    throw new Error('não deveria atualizar pedido');
  };
  const request = {
    header(name) {
      return name === 'asaas-access-token' ? 'webhook-test-token' : undefined;
    },
    body: {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: 'pay_asaas_91',
        externalReference: 'orderpix:7:91',
        value: 59.9,
        walletId: 'wallet-tenant-a',
      },
    },
  };
  const response = createResponse();

  await controller.handle(request, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.payload, { received: true, ignored: true });
  assert.deepEqual(capturedQuery.where, { id: 91, restaurantId: 7 });
  assert.equal(updateCalls, 0);
});
