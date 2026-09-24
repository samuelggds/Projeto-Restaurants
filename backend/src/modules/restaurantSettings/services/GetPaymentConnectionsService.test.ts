// @ts-nocheck
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../../config/prisma.js';
import repository from '../repositories/RestaurantSettingsRepository.js';
import asaasStatus from './GetAsaasConnectionStatusService.js';
import service, { paymentConnectionConfiguration } from './GetPaymentConnectionsService.js';
import getSettings from './GetRestaurantSettingsService.js';
import controller from '../controllers/GetPaymentConnectionsController.js';

const initialEnv = { ...process.env };
const original = {
  find: repository.findByRestaurantId,
  status: asaasStatus.execute,
  transaction: prisma.$transaction,
  execute: service.execute,
};

beforeEach(() => {
  for (const name of Object.keys(process.env)) {
    if (/^(MP_|MERCADO_PAGO_|PAGBANK_|ASAAS_)/.test(name)) delete process.env[name];
  }
  Object.assign(process.env, {
    CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64'),
    BACKEND_URL: 'https://api.gastronexa.example',
    FRONTEND_URL: 'https://gastronexa.example',
    MP_OAUTH_CLIENT_ID: 'test-mp-id',
    MP_OAUTH_CLIENT_SECRET: 'test-mp-secret',
    MP_WEBHOOK_SECRET: 'test-webhook',
    ASAAS_API_KEY: 'test-asaas-platform',
    ASAAS_WEBHOOK_TOKEN: 'test-webhook-token-with-32-characters',
  });
  asaasStatus.execute = async () => ({ credentialsConfigured: false, recoveryRequired: false });
});

afterEach(() => {
  repository.findByRestaurantId = original.find;
  asaasStatus.execute = original.status;
  service.execute = original.execute;
  prisma.$transaction = original.transaction;
  for (const name of Object.keys(process.env)) if (!(name in initialEnv)) delete process.env[name];
  Object.assign(process.env, initialEnv);
});

test('prontidão exige os pré-requisitos, rejeita callback externo e não usa tokens globais como conta vinculada', async () => {
  assert.equal(paymentConnectionConfiguration('MERCADO_PAGO'), true);
  assert.equal(paymentConnectionConfiguration('ASAAS'), true);
  process.env.MP_OAUTH_REDIRECT_URI = 'https://external.example/callback';
  assert.equal(paymentConnectionConfiguration('MERCADO_PAGO'), false);
  delete process.env.MP_OAUTH_REDIRECT_URI;
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  process.env.MP_ACCESS_TOKEN = 'global-mp';
  repository.findByRestaurantId = async () => null;
  const result = await service.execute({ restaurantId: 7 });
  assert.ok(
    result.connections.every(
      (connection) => !connection.connected && !connection.readyForPix && !connection.readyForCard,
    ),
  );
  assert.ok(result.connections.every((connection) => connection.canConnect));
  delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  assert.equal(paymentConnectionConfiguration('MERCADO_PAGO'), false);
  assert.equal(paymentConnectionConfiguration('ASAAS'), false);
});

test('Asaas fica indisponível até a integração principal da plataforma estar configurada', async () => {
  delete process.env.ASAAS_API_KEY;
  assert.equal(paymentConnectionConfiguration('ASAAS'), false);
  repository.findByRestaurantId = async () => null;
  const result = await service.execute({ restaurantId: 7 });
  const connection = result.connections.find((item) => item.provider === 'ASAAS');
  assert.equal(connection?.canConnect, false);
  assert.equal(connection?.status, 'UNAVAILABLE');
  assert.match(connection?.message || '', /temporariamente indisponível/i);
});

test('credenciais e grants renováveis do restaurante ficam prontos sem expor nenhum segredo', async () => {
  const requested: number[] = [];
  repository.findByRestaurantId = async (id) => {
    requested.push(id);
    return {
      restaurantId: id,
      mercadoPagoAccessToken: 'private-mp',
      mercadoPagoRefreshToken: 'private-refresh-mp',
      mercadoPagoTokenExpiresAt: new Date(Date.now() + 3600_000),
      mercadoPagoPublicKey: 'APP_USR-seller-public',
      pagbankToken: 'private-pb',
      pagbankRefreshToken: 'private-refresh-pb',
      pagbankTokenExpiresAt: new Date(Date.now() + 3600_000),
    };
  };
  const result = await service.execute({ restaurantId: 7 });
  assert.ok(requested.every((id) => id === 7));
  const mercadoPago = result.connections.find((connection) => connection.provider === 'MERCADO_PAGO');
  assert.equal(mercadoPago?.status, 'CONNECTED');
  assert.equal(mercadoPago?.readyForPix, true);
  assert.equal(mercadoPago?.readyForCard, true);
  assert.equal(JSON.stringify(result).includes('private-'), false);
});

test('Mercado Pago conectado sem public key exige reconexão antes do cartão', async () => {
  repository.findByRestaurantId = async () => ({
    restaurantId: 7,
    mercadoPagoAccessToken: 'private-mp',
    mercadoPagoRefreshToken: 'private-refresh-mp',
    mercadoPagoTokenExpiresAt: new Date(Date.now() + 3600_000),
    mercadoPagoPublicKey: null,
  });

  const result = await service.execute({ restaurantId: 7 });
  const connection = result.connections.find((item) => item.provider === 'MERCADO_PAGO');

  assert.equal(connection?.connected, true);
  assert.equal(connection?.status, 'NEEDS_RECONNECT');
  assert.equal(connection?.readyForPix, false);
  assert.equal(connection?.readyForCard, false);
  assert.match(connection?.message || '', /chave pública/i);
  assert.equal(JSON.stringify(result).includes('private-'), false);
});

test('grant legado sem refresh token exige reconexão antes de pagamentos em produção', async () => {
  repository.findByRestaurantId = async () => ({
    restaurantId: 7,
    mercadoPagoAccessToken: 'legacy-mp',
  });
  const result = await service.execute({ restaurantId: 7 });
  const connection = result.connections.find((item) => item.provider === 'MERCADO_PAGO');
  assert.equal(connection?.connected, true);
  assert.equal(connection?.status, 'NEEDS_RECONNECT');
  assert.equal(connection?.readyForPix, false);
  assert.equal(connection?.readyForCard, false);
  assert.equal(connection?.canConnect, true);
});

test('um grant expirado sem renovação não é anunciado como pronto', async () => {
  const settings = {
    restaurantId: 7,
    mercadoPagoAccessToken: 'expired-token',
    mercadoPagoTokenExpiresAt: new Date(0),
  };
  repository.findByRestaurantId = async () => settings;
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [],
      restaurantSettings: { findUnique: async () => settings },
    });
  const result = await service.execute({ restaurantId: 7 });
  assert.equal(result.connections[0].status, 'NEEDS_RECONNECT');
  assert.equal(result.connections[0].readyForPix, false);
  assert.equal(result.connections[0].canConnect, true);
});

test('Asaas mantém cadastro pendente e bloqueia nova criação após resposta incerta', async () => {
  repository.findByRestaurantId = async () => ({
    restaurantId: 7,
    asaasAccessToken: 'private-asaas',
  });
  asaasStatus.execute = async ({ restaurantId }) => {
    assert.equal(restaurantId, 7);
    return {
      approvalStatus: 'PENDING',
      readyForPayments: false,
      recoveryRequired: false,
      message: 'Envie seus documentos.',
    };
  };
  let connection = (await service.execute({ restaurantId: 7 })).connections.find(
    (item) => item.provider === 'ASAAS',
  )!;
  assert.equal(connection.status, 'PENDING_APPROVAL');
  assert.equal(connection.readyForCard, false);
  asaasStatus.execute = async () => ({
    recoveryRequired: true,
    message: 'Confira a criação anterior.',
  });
  connection = (await service.execute({ restaurantId: 7 })).connections.find(
    (item) => item.provider === 'ASAAS',
  )!;
  assert.equal(connection.status, 'ACTION_REQUIRED');
  assert.equal(connection.canConnect, false);
});

test('resposta das configurações não vaza tokens de renovação ou hash do webhook', async () => {
  repository.findByRestaurantId = async () => ({
    restaurantId: 7,
    mercadoPagoAccessToken: 'private-access',
    mercadoPagoRefreshToken: 'private-refresh',
    pagbankToken: 'private-access-pb',
    pagbankRefreshToken: 'private-refresh-pb',
    asaasAccessToken: 'private-asaas',
    asaasWebhookTokenHash: 'private-hash',
    restaurant: { deliveryFeeRanges: [] },
  });
  const settings = await getSettings.execute({ restaurantId: 7 });
  assert.equal(settings.mercadoPagoRefreshToken, null);
  assert.equal(settings.pagbankRefreshToken, null);
  assert.equal(settings.asaasWebhookTokenHash, null);
  assert.equal(JSON.stringify(settings).includes('private-'), false);
});

test('controller usa apenas o restaurante autenticado, nunca os IDs enviados pelo navegador', async () => {
  let called;
  service.execute = async (payload) => {
    called = payload;
    return { connections: [] };
  };
  const res = { setHeader() {}, json: (data) => data };
  await controller.handle(
    { user: { restaurantId: 7 }, query: { restaurantId: 999 }, body: { restaurantId: 999 } },
    res,
  );
  assert.deepEqual(called, { restaurantId: 7 });
});
