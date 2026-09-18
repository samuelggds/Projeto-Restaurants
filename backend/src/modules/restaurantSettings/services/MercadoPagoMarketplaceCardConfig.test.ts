import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { getMercadoPagoMarketplacePublicKey } from './MercadoPagoMarketplaceCardConfig.js';

const originalEnv = { ...process.env };

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnv)) delete process.env[name];
  }
  Object.assign(process.env, originalEnv);
});

test('usa a Public Key da aplicação marketplace GastroNexa', () => {
  process.env.MERCADO_PAGO_PUBLIC_KEY = 'APP_USR-marketplace-production';
  process.env.MP_PUBLIC_KEY = 'APP_USR-alias';

  assert.equal(
    getMercadoPagoMarketplacePublicKey(),
    'APP_USR-marketplace-production',
  );
});

test('aceita MP_PUBLIC_KEY como alias da chave marketplace', () => {
  delete process.env.MERCADO_PAGO_PUBLIC_KEY;
  process.env.MP_PUBLIC_KEY = 'APP_USR-marketplace-alias';

  assert.equal(getMercadoPagoMarketplacePublicKey(), 'APP_USR-marketplace-alias');
});

test('falha fechado quando a Public Key marketplace não está configurada', () => {
  delete process.env.MERCADO_PAGO_PUBLIC_KEY;
  delete process.env.MP_PUBLIC_KEY;

  assert.throws(
    () => getMercadoPagoMarketplacePublicKey(),
    /Pagamento com cartão indisponível no momento/,
  );
});
