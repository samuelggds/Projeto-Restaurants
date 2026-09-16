// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import {
  getWhatsappOrderNotificationDestination,
  hasWhatsappOrderNotificationOptIn,
  recordWhatsappOrderNotificationOptIn,
  WHATSAPP_ORDER_CONSENT_ACTION,
} from './whatsappOrderConsent.js';

const originalFindFirst = prisma.auditLog.findFirst;
const originalCreate = prisma.auditLog.create;

afterEach(() => {
  prisma.auditLog.findFirst = originalFindFirst;
  prisma.auditLog.create = originalCreate;
});

test('registra consentimento transacional com o WhatsApp exato informado no checkout', async () => {
  let created = null;
  prisma.auditLog.findFirst = async () => null;
  prisma.auditLog.create = async ({ data }) => {
    created = data;
    return { id: 1, ...data };
  };

  const recorded = await recordWhatsappOrderNotificationOptIn({
    restaurantId: 12,
    orderId: 44,
    userId: 7,
    customerPhone: '(85) 99999-9999',
  });

  assert.equal(recorded, true);
  assert.equal(created.restaurantId, 12);
  assert.equal(created.userId, 7);
  assert.equal(created.action, WHATSAPP_ORDER_CONSENT_ACTION);
  assert.equal(created.resource, 'Order:44');
  assert.equal(created.metadata.channel, 'whatsapp');
  assert.equal(created.metadata.scope, 'ORDER_TRANSACTIONAL_UPDATES');
  assert.equal(created.metadata.destinationPhone, '+5585999999999');
  assert.equal(JSON.stringify(created).includes('token'), false);
});

test('não registra opt-in sem um número válido para aquele pedido', async () => {
  let createCalls = 0;
  prisma.auditLog.findFirst = async () => null;
  prisma.auditLog.create = async () => {
    createCalls += 1;
    return { id: 1 };
  };

  assert.equal(
    await recordWhatsappOrderNotificationOptIn({
      restaurantId: 12,
      orderId: 44,
      userId: 7,
      customerPhone: '8599',
    }),
    false,
  );
  assert.equal(createCalls, 0);
});

test('não duplica a evidência quando o mesmo pedido repete o mesmo número', async () => {
  let createCalls = 0;
  prisma.auditLog.findFirst = async () => ({
    id: 99,
    metadata: { destinationPhone: '+5585999999999' },
  });
  prisma.auditLog.create = async () => {
    createCalls += 1;
    return { id: 100 };
  };

  assert.equal(
    await recordWhatsappOrderNotificationOptIn({
      restaurantId: 12,
      orderId: 44,
      userId: 7,
      customerPhone: '(85) 99999-9999',
    }),
    true,
  );
  assert.equal(createCalls, 0);
});

test('registra uma nova evidência quando o WhatsApp do mesmo pedido muda', async () => {
  let created = null;
  prisma.auditLog.findFirst = async () => ({
    id: 99,
    metadata: { destinationPhone: '+5511988887777' },
  });
  prisma.auditLog.create = async ({ data }) => {
    created = data;
    return { id: 100, ...data };
  };

  assert.equal(
    await recordWhatsappOrderNotificationOptIn({
      restaurantId: 12,
      orderId: 44,
      userId: 7,
      customerPhone: '(85) 99999-9999',
    }),
    true,
  );
  assert.equal(created.metadata.destinationPhone, '+5585999999999');
});

test('consulta o destino mais recente sempre pelo restaurante e pedido exatos', async () => {
  let receivedArgs = null;
  prisma.auditLog.findFirst = async (args) => {
    receivedArgs = args;
    return {
      id: 8,
      metadata: { destinationPhone: '+5585999999999' },
    };
  };

  assert.equal(await getWhatsappOrderNotificationDestination(21, 345), '+5585999999999');
  assert.equal(await hasWhatsappOrderNotificationOptIn(21, 345), true);
  assert.deepEqual(receivedArgs.where, {
    restaurantId: 21,
    action: WHATSAPP_ORDER_CONSENT_ACTION,
    resource: 'Order:345',
  });
  assert.deepEqual(receivedArgs.orderBy, { id: 'desc' });
});

test('falha fechado para ids ausentes ou inválidos sem consultar banco', async () => {
  let called = false;
  prisma.auditLog.findFirst = async () => {
    called = true;
    return { id: 1, metadata: { destinationPhone: '+5585999999999' } };
  };

  assert.equal(await hasWhatsappOrderNotificationOptIn(null, 1), false);
  assert.equal(await hasWhatsappOrderNotificationOptIn(1, null), false);
  assert.equal(await hasWhatsappOrderNotificationOptIn('x', 2), false);
  assert.equal(called, false);
});
