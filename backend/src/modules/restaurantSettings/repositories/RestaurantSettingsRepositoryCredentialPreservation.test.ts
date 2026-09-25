import assert from 'node:assert/strict';
import test from 'node:test';

import { encryptCredentialData } from './RestaurantSettingsRepository.js';

test('update parcial preserva credenciais de gateway que não foram enviadas', () => {
  const result = encryptCredentialData(
    {
      primaryColor: '#123456',
      pagarmeSecretKey: undefined,
      mercadoPagoAccessToken: undefined,
      asaasAccessToken: { set: undefined },
    },
    7,
  );

  assert.equal(result.primaryColor, '#123456');
  assert.equal(result.pagarmeSecretKey, undefined);
  assert.equal(result.mercadoPagoAccessToken, undefined);
  assert.deepEqual(result.asaasAccessToken, { set: undefined });
});

test('null explícito continua removendo a credencial solicitada', () => {
  const result = encryptCredentialData({ pagarmeSecretKey: null }, 7);
  assert.equal(result.pagarmeSecretKey, null);
});
