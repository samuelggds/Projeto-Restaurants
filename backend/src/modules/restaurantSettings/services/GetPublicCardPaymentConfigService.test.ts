import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import service from './GetPublicCardPaymentConfigService.js';

const originalFindRestaurantById = restaurantSettingsRepository.findRestaurantById;
const originalFindByRestaurantId = restaurantSettingsRepository.findByRestaurantId;
const originalEnv = { ...process.env };

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
      mercadoPagoPublicKey: null,
    }) as never;

  await assert.rejects(
    () => service.execute(2),
    /Reconecte o Mercado Pago deste restaurante/,
  );
});
