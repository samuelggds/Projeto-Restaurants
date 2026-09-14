// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  resolveGupshupAppName,
  resolveWhatsAppDeliveryProvider,
  sendGupshupTextMessage,
} from './whatsappProvider.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test('seleciona Gupshup quando a API key está configurada', () => {
  delete process.env.CUSTOMER_NOTIFICATION_PROVIDER;
  delete process.env.WHATSAPP_WEBHOOK_URL;
  process.env.GUPSHUP_API_KEY = 'test-key';

  assert.equal(resolveWhatsAppDeliveryProvider(), 'gupshup');
});

test('mapeia o app da Gupshup pelo número do restaurante', () => {
  process.env.GUPSHUP_APP_BY_SOURCE_JSON = JSON.stringify({
    '5585999999999': 'NorthPizza',
    '+55 (11) 98888-7777': 'SouthBurger',
  });
  delete process.env.GUPSHUP_APP_NAME;

  assert.equal(resolveGupshupAppName('+55 85 99999-9999'), 'NorthPizza');
  assert.equal(resolveGupshupAppName('5511988887777'), 'SouthBurger');
});

test('envia texto usando o contrato oficial da Gupshup', async () => {
  process.env.GUPSHUP_API_KEY = 'secret-api-key';
  process.env.GUPSHUP_APP_NAME = 'NorthPizza';
  process.env.GUPSHUP_API_URL = 'https://api.gupshup.io/wa/api/v1/msg';

  let receivedUrl = '';
  let receivedInit = null;
  const fakeFetch = async (url, init) => {
    receivedUrl = String(url);
    receivedInit = init;
    return new Response(null, { status: 202 });
  };

  const result = await sendGupshupTextMessage({
    source: '+55 85 99999-9999',
    destination: '+55 85 98888-7777',
    message: 'Pedido #107 confirmado.',
    send: fakeFetch,
  });

  assert.deepEqual(result, { sent: true, provider: 'gupshup' });
  assert.equal(receivedUrl, 'https://api.gupshup.io/wa/api/v1/msg');
  assert.equal(receivedInit.headers.apikey, 'secret-api-key');
  assert.equal(receivedInit.headers['Content-Type'], 'application/x-www-form-urlencoded');

  const body = new URLSearchParams(String(receivedInit.body));
  assert.equal(body.get('channel'), 'whatsapp');
  assert.equal(body.get('source'), '5585999999999');
  assert.equal(body.get('destination'), '5585988887777');
  assert.equal(body.get('src.name'), 'NorthPizza');
  assert.deepEqual(JSON.parse(body.get('message')), {
    type: 'text',
    text: 'Pedido #107 confirmado.',
  });
});
