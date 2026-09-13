// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach, beforeEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository, {
  encryptCredentialData,
} from '../repositories/RestaurantSettingsRepository.js';
import {
  credentialEncryptionContext,
  decryptCredential,
} from '../security/credentialEncryption.js';
import {
  getMercadoPagoAccessToken,
  getPagBankAccessToken,
  parseOAuthCredentials,
  saveRestaurantOAuthCredentials,
} from './RestaurantPaymentCredentialsService.js';

const originals = {
  transaction: prisma.$transaction,
  findUnique: prisma.restaurantSettings.findUnique,
  repositoryRead: restaurantSettingsRepository.findByRestaurantId,
  fetch: globalThis.fetch,
};
const envNames = [
  'CREDENTIAL_ENCRYPTION_KEY',
  'ALLOW_GLOBAL_PAYMENT_FALLBACK',
  'MP_ACCESS_TOKEN',
  'MP_OAUTH_CLIENT_ID',
  'MP_OAUTH_CLIENT_SECRET',
  'PAGBANK_CONNECT_CLIENT_ID',
  'PAGBANK_CONNECT_CLIENT_SECRET',
  'PAGBANK_CONNECT_PLATFORM_TOKEN',
];
let previousEnv;
let rows;
let locks;
let statements;
let calls;

beforeEach(() => {
  previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'ab'.repeat(32);
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'false';
  process.env.MP_OAUTH_CLIENT_ID = 'test-client';
  process.env.MP_OAUTH_CLIENT_SECRET = 'test-secret';
  process.env.PAGBANK_CONNECT_CLIENT_ID = 'test-pb-client';
  process.env.PAGBANK_CONNECT_CLIENT_SECRET = 'test-pb-secret';
  process.env.PAGBANK_CONNECT_PLATFORM_TOKEN = 'test-platform-token';
  rows = new Map();
  locks = new Map();
  statements = [];
  calls = [];
  prisma.restaurantSettings.findUnique = async ({ where }) =>
    structuredClone(rows.get(where.restaurantId) || null);
  restaurantSettingsRepository.findByRestaurantId = async (restaurantId) =>
    structuredClone(rows.get(restaurantId) || null);
  prisma.$transaction = async (callback, options) => {
    assert.equal(options.timeout, 40_000);
    let release;
    const tx = {
      $queryRaw: async (parts, ...values) => {
        statements.push(parts.join('?'));
        if (!parts.join('').includes('pg_advisory_xact_lock')) return [];
        const key = values.join(':');
        const previous = locks.get(key) || Promise.resolve();
        const current = new Promise((resolve) => {
          release = resolve;
        });
        locks.set(
          key,
          previous.then(() => current),
        );
        await previous;
        return [];
      },
      restaurantSettings: {
        findUnique: prisma.restaurantSettings.findUnique,
        updateMany: async ({ where, data }) => {
          const current = rows.get(where.restaurantId);
          if (!current || Object.entries(where).some(([key, value]) => current[key] !== value))
            return { count: 0 };
          rows.set(where.restaurantId, { ...current, ...data });
          return { count: 1 };
        },
        upsert: async ({ where, update, create }) => {
          const previous = rows.get(where.restaurantId);
          rows.set(where.restaurantId, previous ? { ...previous, ...update } : create);
        },
      },
    };
    try {
      return await callback(tx);
    } finally {
      release?.();
    }
  };
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(
      JSON.stringify({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
      }),
      { status: 200 },
    );
  };
});

afterEach(() => {
  prisma.$transaction = originals.transaction;
  prisma.restaurantSettings.findUnique = originals.findUnique;
  restaurantSettingsRepository.findByRestaurantId = originals.repositoryRead;
  globalThis.fetch = originals.fetch;
  for (const name of envNames) {
    if (previousEnv[name] === undefined) delete process.env[name];
    else process.env[name] = previousEnv[name];
  }
});

function install(provider, overrides = {}, restaurantId = 7) {
  const data =
    provider === 'MERCADO_PAGO'
      ? {
          mercadoPagoAccessToken: 'old-access',
          mercadoPagoRefreshToken: 'old-refresh',
          mercadoPagoTokenExpiresAt: new Date(0),
          mercadoPagoPublicKey: 'public-test',
        }
      : {
          pagbankToken: 'old-access',
          pagbankRefreshToken: 'old-refresh',
          pagbankTokenExpiresAt: new Date(0),
          pagbankEnvironment: 'production',
        };
  rows.set(
    restaurantId,
    encryptCredentialData(
      { restaurantId, pixProvider: 'ASAAS', cardGateway: 'PAGBANK', ...data, ...overrides },
      restaurantId,
    ),
  );
}

for (const [provider, getToken, accessField, refreshField, expiresField] of [
  [
    'MERCADO_PAGO',
    getMercadoPagoAccessToken,
    'mercadoPagoAccessToken',
    'mercadoPagoRefreshToken',
    'mercadoPagoTokenExpiresAt',
  ],
  [
    'PAGBANK',
    getPagBankAccessToken,
    'pagbankToken',
    'pagbankRefreshToken',
    'pagbankTokenExpiresAt',
  ],
]) {
  test(`${provider}: reusa token válido sem chamar provedor ou adquirir lock`, async () => {
    install(provider, { [expiresField]: new Date(Date.now() + 120_000) });
    assert.equal(await getToken(7), 'old-access');
    assert.equal(calls.length, 0);
    assert.equal(statements.length, 0);
  });

  test(`${provider}: renova uma vez entre requisições concorrentes e persiste rotação criptografada`, async () => {
    install(provider);
    const result = await Promise.all([getToken(7), getToken(7), getToken(7)]);
    assert.deepEqual(result, ['new-access', 'new-access', 'new-access']);
    assert.equal(calls.length, 1);
    assert.ok(statements.some((sql) => sql.includes('pg_advisory_xact_lock')));
    assert.equal(calls[0].body.refresh_token, 'old-refresh');
    assert.equal(calls[0].init.redirect, 'error');
    assert.equal(calls[0].body.grant_type, 'refresh_token');
    const saved = rows.get(7);
    assert.match(saved[accessField], /^enc:v1:/);
    assert.match(saved[refreshField], /^enc:v1:/);
    assert.equal(
      decryptCredential(saved[refreshField], credentialEncryptionContext(7, refreshField)),
      'new-refresh',
    );
    assert.ok(saved[expiresField].getTime() > Date.now() + 3_500_000);
    assert.equal(saved.pixProvider, 'ASAAS');
    assert.equal(saved.cardGateway, 'PAGBANK');
    if (provider === 'PAGBANK') {
      assert.equal(calls[0].url, 'https://api.pagseguro.com/oauth2/refresh');
      assert.equal(calls[0].init.headers.X_CLIENT_ID, 'test-pb-client');
      assert.equal(calls[0].init.headers.Authorization, 'Bearer test-platform-token');
    } else {
      assert.equal(calls[0].url, 'https://api.mercadopago.com/oauth/token');
      assert.equal(calls[0].body.client_id, 'test-client');
    }
  });

  test(`${provider}: falha fechada no refresh sem revelar resposta do provedor`, async () => {
    install(provider);
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: 'secret-provider-token' }), { status: 401 });
    await assert.rejects(
      () => getToken(7),
      (error) =>
        /Conecte a conta novamente/.test(error.message) &&
        !error.message.includes('secret-provider-token'),
    );
    assert.equal(
      decryptCredential(rows.get(7)[refreshField], credentialEncryptionContext(7, refreshField)),
      'old-refresh',
    );
  });

  test(`${provider}: credencial expirada sem refresh exige reconexão`, async () => {
    install(provider, { [refreshField]: null });
    await assert.rejects(() => getToken(7), /Conecte a conta novamente/);
    assert.equal(calls.length, 0);
  });

  test(`${provider}: credencial manual sem validade continua utilizável`, async () => {
    install(provider, { [refreshField]: null, [expiresField]: null });
    assert.equal(await getToken(7), 'old-access');
    assert.equal(calls.length, 0);
  });

  test(`${provider}: nova autorização preserva seleção e limpa metadados da conta anterior`, async () => {
    install(provider);
    await saveRestaurantOAuthCredentials(7, provider, {
      accessToken: 'different-account',
      refreshToken: null,
      expiresAt: null,
    });
    assert.equal(rows.get(7)[refreshField], null);
    assert.equal(rows.get(7)[expiresField], null);
    assert.equal(rows.get(7).pixProvider, 'ASAAS');
    assert.equal(rows.get(7).cardGateway, 'PAGBANK');
  });
}

test('expiração OAuth é exata e não estendida artificialmente para grants curtos', () => {
  assert.equal(
    parseOAuthCredentials({ access_token: 'a', expires_in: 20 }, 1_000).expiresAt.getTime(),
    21_000,
  );
  assert.equal(parseOAuthCredentials({ access_token: 'a', expires_in: -1 }, 1_000).expiresAt, null);
  assert.equal(
    parseOAuthCredentials({ access_token: 'a', expires_in: Number.MAX_VALUE }, 1_000).expiresAt,
    null,
  );
});

test('troca manual concorrente prevalece sobre refresh da conta antiga', async () => {
  install('MERCADO_PAGO');
  globalThis.fetch = async () => {
    install('MERCADO_PAGO', {
      mercadoPagoAccessToken: 'manual-new-account',
      mercadoPagoRefreshToken: null,
      mercadoPagoTokenExpiresAt: null,
    });
    return new Response(
      JSON.stringify({
        access_token: 'stale-access',
        refresh_token: 'stale-refresh',
        expires_in: 3600,
      }),
    );
  };
  assert.equal(await getMercadoPagoAccessToken(7), 'manual-new-account');
  assert.equal(
    decryptCredential(
      rows.get(7).mercadoPagoAccessToken,
      credentialEncryptionContext(7, 'mercadoPagoAccessToken'),
    ),
    'manual-new-account',
  );
});

test('não usa credencial de outro restaurante nem fallback global sem autorização', async () => {
  install('MERCADO_PAGO', {}, 8);
  process.env.MP_ACCESS_TOKEN = 'platform-fallback';
  await assert.rejects(() => getMercadoPagoAccessToken(7), /não foi conectado/);
  await assert.rejects(() => getMercadoPagoAccessToken(0), /Restaurante inválido/);
  process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK = 'true';
  assert.equal(await getMercadoPagoAccessToken(7), 'platform-fallback');
  assert.equal(calls.length, 0);
});
