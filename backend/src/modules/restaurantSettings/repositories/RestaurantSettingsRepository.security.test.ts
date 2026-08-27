// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import prisma from '../../../config/prisma.js';
import repository from './RestaurantSettingsRepository.js';
import { isEncryptedCredential } from '../security/credentialEncryption.js';

const originals = {
  create: prisma.restaurantSettings.create,
  update: prisma.restaurantSettings.update,
  findUnique: prisma.restaurantSettings.findUnique,
};
const originalKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

afterEach(() => {
  Object.assign(prisma.restaurantSettings, originals);
  if (originalKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  else process.env.CREDENTIAL_ENCRYPTION_KEY = originalKey;
});

function installKey() {
  process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.from(
    '0123456789abcdef0123456789abcdef',
  ).toString('base64');
}

test('repository persiste segredo cifrado e devolve valor somente em memória', async () => {
  installKey();
  let stored;
  prisma.restaurantSettings.create = async ({ data }) => {
    stored = { id: 1, ...data };
    return stored;
  };

  const result = await repository.create({
    restaurantId: 7,
    deliveryFee: 0,
    minimumOrder: 0,
    asaasAccessToken: 'asaas-secret',
    stripeSecretKey: 'stripe-secret',
  });

  assert.equal(isEncryptedCredential(stored.asaasAccessToken), true);
  assert.equal(isEncryptedCredential(stored.stripeSecretKey), true);
  assert.equal(result.asaasAccessToken, 'asaas-secret');
  assert.equal(result.stripeSecretKey, 'stripe-secret');
});

test('repository descriptografa credenciais ao buscar configuração privada', async () => {
  installKey();
  let stored;
  prisma.restaurantSettings.create = async ({ data }) => {
    stored = { id: 1, ...data };
    return stored;
  };
  await repository.create({
    restaurantId: 9,
    deliveryFee: 0,
    minimumOrder: 0,
    mercadoPagoAccessToken: 'mp-secret',
  });
  prisma.restaurantSettings.findUnique = async () => ({
    ...stored,
    restaurant: { name: 'Tenant' },
  });

  const result = await repository.findByRestaurantId(9);
  assert.equal(result.mercadoPagoAccessToken, 'mp-secret');
});
