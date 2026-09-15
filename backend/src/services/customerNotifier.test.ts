// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import {
  notifyCustomerOrderStatusChanged,
  notifyCustomerPaymentConfirmed,
} from './customerNotifier.js';

const originalFindUnique = prisma.restaurantSettings.findUnique;
const originalAuditFindFirst = prisma.auditLog.findFirst;
const originalConsoleError = console.error;

afterEach(() => {
  prisma.restaurantSettings.findUnique = originalFindUnique;
  prisma.auditLog.findFirst = originalAuditFindFirst;
  console.error = originalConsoleError;
});

test('não envia confirmação nem mudança de status quando o restaurante desativou os avisos', async () => {
  const consultedRestaurantIds: number[] = [];
  prisma.restaurantSettings.findUnique = async ({ where }) => {
    consultedRestaurantIds.push(where.restaurantId);
    return {
      whatsappEnabled: true,
      receiveStatusNotifications: false,
    };
  };

  const confirmation = await notifyCustomerPaymentConfirmed({
    restaurantId: 41,
    orderId: 100,
    customerPhone: '85999999999',
  });
  const status = await notifyCustomerOrderStatusChanged({
    restaurantId: 41,
    orderId: 100,
    customerPhone: '85999999999',
  });

  assert.deepEqual(consultedRestaurantIds, [41, 41]);
  assert.deepEqual(confirmation, {
    sent: false,
    reason: 'status_notifications_disabled',
  });
  assert.deepEqual(status, {
    sent: false,
    reason: 'status_notifications_disabled',
  });
});

test('respeita o desligamento geral do WhatsApp do mesmo restaurante', async () => {
  prisma.restaurantSettings.findUnique = async ({ where }) => {
    assert.deepEqual(where, { restaurantId: 72 });
    return {
      whatsappEnabled: false,
      receiveStatusNotifications: true,
    };
  };

  const result = await notifyCustomerOrderStatusChanged({
    restaurantId: 72,
    orderId: 101,
    customerPhone: '85999999999',
  });

  assert.deepEqual(result, {
    sent: false,
    reason: 'whatsapp_disabled',
  });
});

test('bloqueia avisos automáticos quando o pedido não possui opt-in do cliente', async () => {
  prisma.restaurantSettings.findUnique = async () => ({
    whatsappEnabled: true,
    receiveStatusNotifications: true,
  });
  prisma.auditLog.findFirst = async ({ where }) => {
    assert.equal(where.restaurantId, 91);
    assert.equal(where.action, 'WHATSAPP_ORDER_NOTIFICATIONS_OPT_IN');
    assert.equal(where.resource, 'Order:501');
    return null;
  };

  const result = await notifyCustomerPaymentConfirmed({
    restaurantId: 91,
    orderId: 501,
    customerPhone: '85999999999',
  });

  assert.deepEqual(result, {
    sent: false,
    reason: 'customer_whatsapp_opt_in_missing',
  });
});

test('com opt-in válido segue para a resolução do provedor', async () => {
  prisma.restaurantSettings.findUnique = async () => ({
    whatsappEnabled: true,
    receiveStatusNotifications: true,
  });
  prisma.auditLog.findFirst = async () => ({ id: 77 });

  const result = await notifyCustomerPaymentConfirmed({
    restaurantId: 9,
    orderId: 502,
    customerPhone: null,
  });

  assert.notEqual(result.reason, 'customer_whatsapp_opt_in_missing');
  assert.notEqual(result.reason, 'whatsapp_disabled');
  assert.notEqual(result.reason, 'status_notifications_disabled');
});

test('não consulta outro tenant e bloqueia quando não há configurações para o restaurantId', async () => {
  let receivedWhere = null;
  prisma.restaurantSettings.findUnique = async ({ where }) => {
    receivedWhere = where;
    return null;
  };

  const result = await notifyCustomerOrderStatusChanged({
    restaurantId: 18,
    orderId: 503,
    customerPhone: '85999999999',
  });

  assert.deepEqual(receivedWhere, { restaurantId: 18 });
  assert.deepEqual(result, {
    sent: false,
    reason: 'restaurant_settings_not_found',
  });
});

test('falha fechada, registra o erro técnico somente no servidor e retorna motivo seguro', async () => {
  const logs: unknown[][] = [];
  prisma.restaurantSettings.findUnique = async () => {
    throw new Error('database password leaked in driver error');
  };
  console.error = (...args) => logs.push(args);

  const result = await notifyCustomerPaymentConfirmed({
    restaurantId: 27,
    orderId: 504,
    customerPhone: '85999999999',
  });

  assert.deepEqual(result, {
    sent: false,
    reason: 'notification_preference_lookup_failed',
  });
  assert.equal('error' in result, false);
  assert.equal(logs.length, 1);
  assert.doesNotMatch(JSON.stringify(logs[0]), /database password leaked/);
  assert.match(JSON.stringify(logs[0]), /Error/);
});

test('payload legado sem restaurantId falha fechado para consentimento sem consulta cruzada', async () => {
  let settingsCalled = false;
  let auditCalled = false;
  prisma.restaurantSettings.findUnique = async () => {
    settingsCalled = true;
    return null;
  };
  prisma.auditLog.findFirst = async () => {
    auditCalled = true;
    return null;
  };

  const result = await notifyCustomerOrderStatusChanged({ customerPhone: null });

  assert.equal(settingsCalled, false);
  assert.equal(auditCalled, false);
  assert.deepEqual(result, {
    sent: false,
    reason: 'customer_whatsapp_opt_in_missing',
  });
});
