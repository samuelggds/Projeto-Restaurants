import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';

import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import service from './GetPublicCardPaymentConfigService.js';

const originalFindRestaurantById = restaurantSettingsRepository.findRestaurantById;
const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalEnv = { ...process.env };

beforeEach(() => {
  Object.assign(process.env, {
    CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 4).toString('base64'),
    BACKEND_URL: 'https://api.gastronexa.example',
    FRONTEND_URL: 'https://gastronexa.example',
    MP_OAUTH_CLIENT_ID: 'test-mp-id',
    MP_OAUTH_CLIENT_SECRET: 'test-mp-secret',
    MP_WEBHOOK_SECRET: 'test-webhook',
  });
});

afterEach(() => {
  restaurantSettingsRepository.findRestaurantById = originalFindRestaurantById;
  restaurantSettingsRepository.findByRestaurantId = originalFindByRestaurantId;
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnv)) delete process.env[name];
  }
  Object.assign(process.env, originalEnv);
});

test('Mercado Pago publica a chave OAuth salva do restaurante', async () => {
  process.env.MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-marketplace';
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'false';

  restaurantSettingsRepository.findRestaurantById = async () =>
    ({ id: 2, active: true }) as never;
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 2,
      acceptsCard: true,
      cardGateway: 'MERCADO_PAGO',
      mercadoPagoAccessToken: 'seller-access',
      mercadoPagoRefreshToken: 'seller-refresh',
      mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
      mercadoPagoPublicKey: 'APP_USR-seller-oauth',
    }) as never;

  const result = await service.execute(2);

  assert.deepEqual(result, {
    provider: 'MERCADO_PAGO',
    publicKey: 'APP_USR-seller-oauth',
  });
});

test('Mercado Pago exige public key do restaurante conectado', async () => {
  restaurantSettingsRepository.findRestaurantById = async () =>
    ({ id: 2, active: true }) as never;
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 2,
      acceptsCard: true,
      cardGateway: 'MERCADO_PAGO',
      mercadoPagoAccessToken: 'seller-access',
      mercadoPagoRefreshToken: 'seller-refresh',
      mercadoPagoTokenExpiresAt: new Date(Date.now() + 3_600_000),
      mercadoPagoPublicKey: null,
    }) as never;

  await assert.rejects(
    () => service.execute(2),
    /conexão Mercado Pago.*precisa ser atualizada/i,
  );
});


test('Mercado Pago não publica chave quando o grant legado não pode renovar', async () => {
  restaurantSettingsRepository.findByRestaurantId = async () =>
    ({
      restaurantId: 2,
      acceptsCard: true,
      cardGateway: 'MERCADO_PAGO',
      mercadoPagoAccessToken: 'legacy-access',
      mercadoPagoRefreshToken: null,
      mercadoPagoPublicKey: 'APP_USR-seller-oauth',
    }) as never;

  await assert.rejects(
    () => service.execute(2),
    /conexão Mercado Pago.*precisa ser atualizada/i,
  );
});
