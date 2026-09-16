// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import { notifyCustomerPaymentConfirmed } from './customerNotifier.js';

const originalProvider = process.env.CUSTOMER_NOTIFICATION_PROVIDER;
const originalFindUnique = prisma.restaurantSettings.findUnique;
const originalAuditFindFirst = prisma.auditLog.findFirst;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.CUSTOMER_NOTIFICATION_PROVIDER;
  else process.env.CUSTOMER_NOTIFICATION_PROVIDER = originalProvider;
  prisma.restaurantSettings.findUnique = originalFindUnique;
  prisma.auditLog.findFirst = originalAuditFindFirst;
});

test('Evolution é aceito como provider de notificações automáticas', async () => {
  process.env.CUSTOMER_NOTIFICATION_PROVIDER = 'evolution';
  prisma.restaurantSettings.findUnique = async () => ({
    whatsappEnabled: true,
    receiveStatusNotifications: true,
  });
  prisma.auditLog.findFirst = async () => ({ id: 1 });

  const result = await notifyCustomerPaymentConfirmed({
    restaurantId: 9,
    restaurantWhatsapp: '85999999999',
    orderId: 502,
    customerPhone: null,
  });

  assert.equal(result.reason, 'invalid_or_missing_phone');
  assert.notEqual(result.reason, 'provider_not_supported');
});
