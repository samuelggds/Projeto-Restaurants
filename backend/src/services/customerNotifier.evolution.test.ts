// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import prisma from '../config/prisma.js';
import { notifyCustomerPaymentConfirmed } from './customerNotifier.js';
import { sendTenantEvolutionTextMessage } from './evolutionTenantWhatsapp.js';
import { sendTenantZapiTextMessage } from './zapiTenantWhatsapp.js';

const originalProvider = process.env.CUSTOMER_NOTIFICATION_PROVIDER;
const originalFindUnique = prisma.restaurantSettings.findUnique;
const originalAuditFindFirst = prisma.auditLog.findFirst;
const originalQueryRaw = prisma.$queryRaw;
const originalFetch = globalThis.fetch;
const originalEvolutionUrl = process.env.EVOLUTION_TENANT_API_URL;
const originalZapiBaseUrl = process.env.ZAPI_BASE_URL;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.CUSTOMER_NOTIFICATION_PROVIDER;
  else process.env.CUSTOMER_NOTIFICATION_PROVIDER = originalProvider;
  prisma.restaurantSettings.findUnique = originalFindUnique;
  prisma.auditLog.findFirst = originalAuditFindFirst;
  prisma.$queryRaw = originalQueryRaw;
  globalThis.fetch = originalFetch;
  if (originalEvolutionUrl === undefined) delete process.env.EVOLUTION_TENANT_API_URL;
  else process.env.EVOLUTION_TENANT_API_URL = originalEvolutionUrl;
  if (originalZapiBaseUrl === undefined) delete process.env.ZAPI_BASE_URL;
  else process.env.ZAPI_BASE_URL = originalZapiBaseUrl;
});

test('Evolution é aceito como provider de notificações automáticas', async () => {
  process.env.CUSTOMER_NOTIFICATION_PROVIDER = 'evolution';
  prisma.restaurantSettings.findUnique = async () => ({
    whatsappEnabled: true,
    receiveStatusNotifications: true,
  });
  prisma.auditLog.findFirst = async () => ({
    id: 1,
    metadata: { destinationPhone: '85999999999' },
  });

  const result = await notifyCustomerPaymentConfirmed({
    restaurantId: 9,
    restaurantWhatsapp: null,
    orderId: 502,
    customerPhone: null,
  });

  assert.equal(result.reason, 'restaurant_whatsapp_not_configured');
  assert.notEqual(result.reason, 'provider_not_supported');
  assert.notEqual(result.reason, 'customer_whatsapp_opt_in_missing');
});


test('Evolution aceita telefone nacional legado e E.164 sem duplicar o DDI', async () => {
  process.env.EVOLUTION_TENANT_API_URL = 'https://evolution.example.test';
  prisma.$queryRaw = async () => [
    {
      id: 1n,
      restaurantId: 9,
      provider: 'EVOLUTION',
      externalInstanceId: 'gastronexa-9',
      instanceTokenCiphertext: 'instance-token',
      webhookSecretHash: '',
      phone: '85999999999',
      status: 'CONNECTED',
      trialExpiresAt: null,
      connectedAt: null,
      disconnectedAt: null,
      lastWebhookAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let body = null;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body || '{}'));
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await sendTenantEvolutionTextMessage({
    restaurantId: 9,
    destination: '85988887777',
    message: 'Pedido confirmado.',
  });

  assert.deepEqual(result, { sent: true, provider: 'evolution' });
  assert.equal(body.number, '5585988887777');
  assert.equal(body.text, 'Pedido confirmado.');

  const internationalResult = await sendTenantEvolutionTextMessage({
    restaurantId: 9,
    destination: '5585988887777',
    message: 'Pedido confirmado.',
  });
  assert.deepEqual(internationalResult, { sent: true, provider: 'evolution' });
  assert.equal(body.number, '5585988887777');

  await assert.rejects(
    () =>
      sendTenantEvolutionTextMessage({
        restaurantId: 9,
        destination: '123',
        message: 'Pedido confirmado.',
      }),
    /Número de destino inválido/i,
  );
});

test('Z-API recebe telefone nacional e acrescenta 55 somente na chamada externa', async () => {
  process.env.ZAPI_BASE_URL = 'https://api.z-api.io';
  prisma.$queryRaw = async () => [
    {
      id: 2n,
      restaurantId: 9,
      provider: 'ZAPI',
      externalInstanceId: 'instance-9',
      instanceTokenCiphertext: 'instance-token',
      webhookSecretHash: '',
      phone: '85999999999',
      status: 'CONNECTED',
      trialExpiresAt: null,
      connectedAt: null,
      disconnectedAt: null,
      lastWebhookAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  let body = null;
  globalThis.fetch = async (_url, init) => {
    body = JSON.parse(String(init?.body || '{}'));
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await sendTenantZapiTextMessage({
    restaurantId: 9,
    destination: '85988887777',
    message: 'Pedido pronto.',
  });

  assert.deepEqual(result, { sent: true, provider: 'zapi' });
  assert.equal(body.phone, '5585988887777');
  assert.equal(body.message, 'Pedido pronto.');

  await assert.rejects(
    () =>
      sendTenantZapiTextMessage({
        restaurantId: 9,
        destination: '5585988887777',
        message: 'Pedido pronto.',
      }),
    /Número de destino inválido/i,
  );
});
