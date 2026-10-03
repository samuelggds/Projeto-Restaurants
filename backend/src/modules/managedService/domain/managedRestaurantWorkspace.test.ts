import assert from 'node:assert/strict';
import test from 'node:test';
import { safeManagedRestaurantSettingsSchema } from '../services/SuperAdminManagedRestaurantService.js';

test('workspace permite somente configurações operacionais explicitamente seguras', () => {
  const parsed = safeManagedRestaurantSettingsSchema.parse({
    restaurantName: 'Restaurante Teste',
    deliveryTimeMin: 30,
    deliveryTimeMax: 45,
    deliveryFee: 5,
    primaryColor: '#FF4B4B',
  });
  assert.equal(parsed.restaurantName, 'Restaurante Teste');
  assert.equal(parsed.deliveryTimeMax, 45);
});

test('workspace rejeita credenciais e dados financeiros sensíveis', () => {
  for (const forbidden of [
    'mercadoPagoAccessToken',
    'asaasAccessToken',
    'gatewayMerchantId',
    'bankAccount',
    'ownerCpf',
    'password',
  ]) {
    assert.throws(() =>
      safeManagedRestaurantSettingsSchema.parse({
        restaurantName: 'Restaurante Teste',
        [forbidden]: 'segredo-nao-permitido',
      }),
    );
  }
});
