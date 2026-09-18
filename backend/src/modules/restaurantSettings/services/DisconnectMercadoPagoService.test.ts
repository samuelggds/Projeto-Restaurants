// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import service from './DisconnectMercadoPagoService.js';

const originalFind = restaurantSettingsRepository.findByRestaurantId;
const originalUpdate = restaurantSettingsRepository.update;

afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalFind;
  restaurantSettingsRepository.update = originalUpdate;
});

test('remove somente credenciais Mercado Pago e desativa métodos que dependem dele', async () => {
  let updatePayload = null;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 7,
    acceptsPix: true,
    acceptsCard: true,
    pixProvider: 'MERCADO_PAGO',
    cardGateway: 'MERCADO_PAGO',
    mercadoPagoAccessToken: 'access-secret',
    mercadoPagoRefreshToken: 'refresh-secret',
    mercadoPagoTokenExpiresAt: new Date('2099-01-01T00:00:00Z'),
    mercadoPagoPublicKey: 'seller-public',
    pagbankToken: 'preserve-pagbank',
    asaasAccessToken: 'preserve-asaas',
  });
  restaurantSettingsRepository.update = async (_id, payload) => {
    updatePayload = payload;
    return {};
  };

  assert.deepEqual(await service.execute({ restaurantId: 7 }), {
    disconnected: true,
    wasConnected: true,
    disabledMethods: { pix: true, card: true },
  });

  assert.deepEqual(updatePayload, {
    mercadoPagoAccessToken: null,
    mercadoPagoRefreshToken: null,
    mercadoPagoTokenExpiresAt: null,
    mercadoPagoPublicKey: null,
    acceptsPix: false,
    acceptsCard: false,
  });
  assert.equal('pagbankToken' in updatePayload, false);
  assert.equal('asaasAccessToken' in updatePayload, false);
});

test('preserva meios ativos quando usam outros provedores', async () => {
  let updatePayload = null;
  restaurantSettingsRepository.findByRestaurantId = async () => ({
    restaurantId: 7,
    acceptsPix: true,
    acceptsCard: true,
    pixProvider: 'ASAAS',
    cardGateway: 'PAGBANK',
    mercadoPagoAccessToken: 'access-secret',
    mercadoPagoRefreshToken: 'refresh-secret',
    mercadoPagoPublicKey: 'seller-public',
  });
  restaurantSettingsRepository.update = async (_id, payload) => {
    updatePayload = payload;
    return {};
  };

  const result = await service.execute({ restaurantId: 7 });

  assert.deepEqual(result.disabledMethods, { pix: false, card: false });
  assert.equal('acceptsPix' in updatePayload, false);
  assert.equal('acceptsCard' in updatePayload, false);
});
