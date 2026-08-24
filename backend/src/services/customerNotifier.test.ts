// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import {
  notifyCustomerOrderStatusChanged,
  notifyCustomerPaymentConfirmed,
} from './customerNotifier.js';

const originalFindUnique = prisma.restaurantSettings.findUnique;
const originalConsoleError = console.error;

afterEach(() => {
  prisma.restaurantSettings.findUnique = originalFindUnique;
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
    customerPhone: '85999999999',
  });
  const status = await notifyCustomerOrderStatusChanged({
    restaurantId: 41,
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
    customerPhone: '85999999999',
  });

  assert.deepEqual(result, {
    sent: false,
    reason: 'whatsapp_disabled',
  });
});

test('mantém compatibilidade quando mocks antigos não possuem os novos campos', async () => {
  prisma.restaurantSettings.findUnique = async ({ where }) => {
    assert.equal(where.restaurantId, 9);
    return { restaurantId: 9 };
  };

  const result = await notifyCustomerPaymentConfirmed({
    restaurantId: 9,
    customerPhone: null,
  });

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
    customerPhone: '85999999999',
  });

  assert.deepEqual(result, {
    sent: false,
    reason: 'notification_preference_lookup_failed',
  });
  assert.equal('error' in result, false);
  assert.equal(logs.length, 1);
  assert.match(JSON.stringify(logs[0]), /database password leaked/);
});

test('payload legado sem restaurantId não dispara consulta global ou cruzada', async () => {
  let wasCalled = false;
  prisma.restaurantSettings.findUnique = async () => {
    wasCalled = true;
    return null;
  };

  const result = await notifyCustomerOrderStatusChanged({ customerPhone: null });

  assert.equal(wasCalled, false);
  assert.notEqual(result.reason, 'restaurant_settings_not_found');
});
