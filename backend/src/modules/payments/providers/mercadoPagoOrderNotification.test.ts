import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import {
  mercadoPagoOrderNotificationFields,
  resolveMercadoPagoOrderNotificationUrl,
} from './mercadoPagoOrderNotification.js';

const originalEnvironment = {
  backendUrl: process.env.BACKEND_URL,
  billingNotificationUrl: process.env.MP_NOTIFICATION_URL,
  orderNotificationUrl: process.env.MP_ORDER_NOTIFICATION_URL,
};

function restoreEnvironmentVariable(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

afterEach(() => {
  restoreEnvironmentVariable('BACKEND_URL', originalEnvironment.backendUrl);
  restoreEnvironmentVariable('MP_NOTIFICATION_URL', originalEnvironment.billingNotificationUrl);
  restoreEnvironmentVariable('MP_ORDER_NOTIFICATION_URL', originalEnvironment.orderNotificationUrl);
});

test('usa a URL exclusiva de pedidos e preserva query existente', () => {
  process.env.MP_ORDER_NOTIFICATION_URL = 'https://api.example.com/hooks/orders?source=mp';
  process.env.MP_NOTIFICATION_URL = 'https://api.example.com/billing/webhook/mercadopago';
  process.env.BACKEND_URL = 'https://fallback.example.com';

  assert.equal(
    resolveMercadoPagoOrderNotificationUrl(27),
    'https://api.example.com/hooks/orders?source=mp&restaurantId=27',
  );
  assert.deepEqual(mercadoPagoOrderNotificationFields(27), {
    notification_url: 'https://api.example.com/hooks/orders?source=mp&restaurantId=27',
  });
});

test('deriva o webhook de pedidos do backend sem reutilizar o webhook de billing', () => {
  delete process.env.MP_ORDER_NOTIFICATION_URL;
  process.env.MP_NOTIFICATION_URL = 'https://api.example.com/billing/webhook/mercadopago';
  process.env.BACKEND_URL = 'https://api.example.com/';

  assert.deepEqual(mercadoPagoOrderNotificationFields(8), {
    notification_url: 'https://api.example.com/orders/webhook/mercadopago?restaurantId=8',
  });
});

test('não publica webhook sem backend de pedidos e restaurante válidos', () => {
  delete process.env.MP_ORDER_NOTIFICATION_URL;
  delete process.env.BACKEND_URL;
  process.env.MP_NOTIFICATION_URL = 'https://api.example.com/billing/webhook/mercadopago';

  assert.deepEqual(mercadoPagoOrderNotificationFields(8), {});
  assert.deepEqual(mercadoPagoOrderNotificationFields(0), {});
});
