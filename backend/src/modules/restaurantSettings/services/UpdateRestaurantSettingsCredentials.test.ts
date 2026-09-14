// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import restaurantSettingsRepository from '../repositories/RestaurantSettingsRepository.js';
import service from './UpdateRestaurantSettingsService.js';

const originalRead = restaurantSettingsRepository.findByRestaurantId;
const originalUpdate = restaurantSettingsRepository.update;
afterEach(() => {
  restaurantSettingsRepository.findByRestaurantId = originalRead;
  restaurantSettingsRepository.update = originalUpdate;
});

const savedCredentials = () => ({
  id: 1,
  restaurantId: 7,
  pixProvider: 'MERCADO_PAGO',
  cardGateway: 'PAGBANK',
  restaurant: {},
  mercadoPagoAccessToken: 'mp-current-account',
  mercadoPagoRefreshToken: 'mp-current-grant',
  mercadoPagoTokenExpiresAt: new Date('2099-01-01T00:00:00Z'),
  mercadoPagoPublicKey: 'mp-current-public-key',
  pagbankToken: 'pb-current-account',
  pagbankRefreshToken: 'pb-current-grant',
  pagbankTokenExpiresAt: new Date('2099-01-01T00:00:00Z'),
});

function store() {
  let saved = savedCredentials();
  restaurantSettingsRepository.findByRestaurantId = async () => structuredClone(saved);
  restaurantSettingsRepository.update = async (restaurantId, data) => {
    assert.equal(restaurantId, 7);
    saved = {
      ...saved,
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    };
    return structuredClone(saved);
  };
  return () => saved;
}

for (const [access, refresh, expiry, current] of [
  [
    'mercadoPagoAccessToken',
    'mercadoPagoRefreshToken',
    'mercadoPagoTokenExpiresAt',
    'mp-current-account',
  ],
  ['pagbankToken', 'pagbankRefreshToken', 'pagbankTokenExpiresAt', 'pb-current-account'],
]) {
  test(`${access}: troca manual limpa apenas o grant anterior do provedor alterado`, async () => {
    const state = store();
    const initial = savedCredentials();
    await service.execute({ restaurantId: 7, [access]: '  new-manual-account  ' });
    assert.equal(state()[access], 'new-manual-account');
    assert.equal(state()[refresh], null);
    assert.equal(state()[expiry], null);
    if (access === 'mercadoPagoAccessToken') {
      assert.equal(state().mercadoPagoPublicKey, null);
      assert.equal(state().pagbankRefreshToken, initial.pagbankRefreshToken);
      assert.deepEqual(state().pagbankTokenExpiresAt, initial.pagbankTokenExpiresAt);
    } else {
      assert.equal(state().mercadoPagoRefreshToken, initial.mercadoPagoRefreshToken);
      assert.equal(state().mercadoPagoPublicKey, initial.mercadoPagoPublicKey);
      assert.deepEqual(state().mercadoPagoTokenExpiresAt, initial.mercadoPagoTokenExpiresAt);
    }
  });

  test(`${access}: reenvio da mesma credencial mantém o grant de renovação`, async () => {
    const state = store();
    const initial = savedCredentials();
    await service.execute({ restaurantId: 7, [access]: `  ${current}  ` });
    assert.equal(state()[access], current);
    assert.equal(state()[refresh], initial[refresh]);
    assert.deepEqual(state()[expiry], initial[expiry]);
    assert.equal(state().mercadoPagoPublicKey, initial.mercadoPagoPublicKey);
  });

  for (const value of [undefined, null, '', '   ']) {
    test(`${access}: valor ${JSON.stringify(value)} preserva credencial e grant durante autosave`, async () => {
      const state = store();
      const initial = savedCredentials();
      await service.execute({ restaurantId: 7, [access]: value, primaryColor: '#123456' });
      assert.equal(state()[access], initial[access]);
      assert.equal(state()[refresh], initial[refresh]);
      assert.deepEqual(state()[expiry], initial[expiry]);
      assert.equal(state().mercadoPagoPublicKey, initial.mercadoPagoPublicKey);
      assert.equal(state().primaryColor, '#123456');
    });
  }
}
