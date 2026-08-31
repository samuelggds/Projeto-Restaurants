import assert from 'node:assert/strict';
import test from 'node:test';

import { encryptCredentialData } from './RestaurantSettingsRepository.js';

test('update parcial preserva credenciais de gateway que não foram enviadas', () => {
  const result = encryptCredentialData(
    {
      primaryColor: '#123456',
      stripeSecretKey: undefined,
      stripeWebhookSecret: undefined,
      mercadoPagoAccessToken: undefined,
      pagbankToken: { set: undefined },
    },
    7,
  );

  assert.equal(result.primaryColor, '#123456');
  assert.equal(result.stripeSecretKey, undefined);
  assert.equal(result.stripeWebhookSecret, undefined);
  assert.equal(result.mercadoPagoAccessToken, undefined);
  assert.deepEqual(result.pagbankToken, { set: undefined });
});

test('null explícito continua removendo a credencial solicitada', () => {
  const result = encryptCredentialData({ stripeWebhookSecret: null }, 7);
  assert.equal(result.stripeWebhookSecret, null);
});
