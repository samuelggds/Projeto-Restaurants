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
  cardGateway: 'MERCADO_PAGO',
  restaurant: {},
  mercadoPagoAccessToken: 'mp-current-account',
  mercadoPagoRefreshToken: 'mp-current-grant',
  mercadoPagoTokenExpiresAt: new Date('2099-01-01T00:00:00Z'),
  mercadoPagoPublicKey: 'mp-current-public-key',
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

test('rejeita troca manual de credencial Mercado Pago e preserva o grant OAuth', async () => {
  const state = store();
  const initial = savedCredentials();

  await assert.rejects(
    () =>
      service.execute({
        restaurantId: 7,
        mercadoPagoAccessToken: 'new-manual-account',
      }),
    /fluxo OAuth/i,
  );

  assert.equal(state().mercadoPagoAccessToken, initial.mercadoPagoAccessToken);
  assert.equal(state().mercadoPagoRefreshToken, initial.mercadoPagoRefreshToken);
  assert.deepEqual(state().mercadoPagoTokenExpiresAt, initial.mercadoPagoTokenExpiresAt);
  assert.equal(state().mercadoPagoPublicKey, initial.mercadoPagoPublicKey);
});

for (const value of [undefined, null, '', '   ']) {
  test(`mercadoPagoAccessToken: valor ${JSON.stringify(value)} preserva o grant OAuth durante autosave`, async () => {
    const state = store();
    const initial = savedCredentials();
    await service.execute({ restaurantId: 7, mercadoPagoAccessToken: value, primaryColor: '#123456' });
    assert.equal(state().mercadoPagoAccessToken, initial.mercadoPagoAccessToken);
    assert.equal(state().mercadoPagoRefreshToken, initial.mercadoPagoRefreshToken);
    assert.deepEqual(state().mercadoPagoTokenExpiresAt, initial.mercadoPagoTokenExpiresAt);
    assert.equal(state().mercadoPagoPublicKey, initial.mercadoPagoPublicKey);
    assert.equal(state().primaryColor, '#123456');
  });
}
