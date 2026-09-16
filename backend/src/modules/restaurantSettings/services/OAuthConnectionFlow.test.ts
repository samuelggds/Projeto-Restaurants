// @ts-nocheck
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import startMP from './StartMercadoPagoOAuthService.js';
import completeMP from './CompleteMercadoPagoOAuthService.js';
import startPB from './StartPagBankOAuthService.js';
import completePB from './CompletePagBankOAuthService.js';
import {
  decryptCredential,
  credentialEncryptionContext,
} from '../security/credentialEncryption.js';

const originals = {
  user: prisma.user.findFirst,
  stateUpsert: prisma.oAuthAuthorizationState.upsert,
  stateFind: prisma.oAuthAuthorizationState.findUnique,
  stateConsume: prisma.oAuthAuthorizationState.updateMany,
  transaction: prisma.$transaction,
  fetch: globalThis.fetch,
};
const envNames = [
  'MP_OAUTH_CLIENT_ID',
  'MP_OAUTH_CLIENT_SECRET',
  'PAGBANK_CONNECT_CLIENT_ID',
  'PAGBANK_CONNECT_CLIENT_SECRET',
  'PAGBANK_CONNECT_PLATFORM_TOKEN',
  'CREDENTIAL_ENCRYPTION_KEY',
  'BACKEND_URL',
  'FRONTEND_URL',
  'MP_WEBHOOK_SECRET',
  'MP_WEBHOOK_SECRETS',
  'MP_ORDER_NOTIFICATION_URL',
  'PAGBANK_NOTIFICATION_URL',
  'MP_OAUTH_REDIRECT_URI',
  'PAGBANK_CONNECT_REDIRECT_URI',
];
let oldEnv;
let storedState;
let settings;
let requests;
let providerBody;

beforeEach(() => {
  oldEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
  process.env.MP_OAUTH_CLIENT_ID = 'mp-client';
  process.env.MP_OAUTH_CLIENT_SECRET = 'mp-secret';
  process.env.PAGBANK_CONNECT_CLIENT_ID = 'pb-client';
  process.env.PAGBANK_CONNECT_CLIENT_SECRET = 'pb-secret';
  process.env.PAGBANK_CONNECT_PLATFORM_TOKEN = 'pb-platform';
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'ab'.repeat(32);
  process.env.BACKEND_URL = 'https://api.example.test';
  process.env.FRONTEND_URL = 'https://example.test';
  process.env.MP_WEBHOOK_SECRET = 'fake-webhook-secret';
  delete process.env.MP_WEBHOOK_SECRETS;
  delete process.env.MP_ORDER_NOTIFICATION_URL;
  delete process.env.PAGBANK_NOTIFICATION_URL;
  delete process.env.MP_OAUTH_REDIRECT_URI;
  delete process.env.PAGBANK_CONNECT_REDIRECT_URI;
  storedState = null;
  settings = { restaurantId: 7, pixProvider: 'ASAAS', cardGateway: 'PAGBANK' };
  requests = [];
  providerBody = {
    access_token: 'seller-access',
    refresh_token: 'seller-refresh',
    expires_in: 3600,
    public_key: 'seller-public',
  };
  prisma.user.findFirst = async ({ where }) =>
    where.id === 11 && where.restaurantId === 7 && where.role === 'ADMIN'
      ? { authVersion: 2 }
      : null;
  prisma.oAuthAuthorizationState.upsert = async ({ create }) => {
    storedState = { consumedAt: null, ...create };
    return storedState;
  };
  prisma.oAuthAuthorizationState.findUnique = async ({ where }) =>
    storedState?.nonceHash === where.nonceHash ? storedState : null;
  prisma.oAuthAuthorizationState.updateMany = async ({ where, data }) => {
    if (
      !storedState ||
      storedState.consumedAt ||
      storedState.nonceHash !== where.nonceHash ||
      storedState.provider !== where.provider
    )
      return { count: 0 };
    storedState = { ...storedState, ...data };
    return { count: 1 };
  };
  prisma.$transaction = async (callback) =>
    callback({
      $queryRaw: async () => [],
      restaurantSettings: {
        upsert: async ({ update }) => {
          settings = { ...settings, ...update };
        },
      },
    });
  globalThis.fetch = async (url, init) => {
    requests.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify(providerBody), { status: 200 });
  };
});

afterEach(() => {
  prisma.user.findFirst = originals.user;
  prisma.oAuthAuthorizationState.upsert = originals.stateUpsert;
  prisma.oAuthAuthorizationState.findUnique = originals.stateFind;
  prisma.oAuthAuthorizationState.updateMany = originals.stateConsume;
  prisma.$transaction = originals.transaction;
  globalThis.fetch = originals.fetch;
  for (const name of envNames) {
    if (oldEnv[name] === undefined) delete process.env[name];
    else process.env[name] = oldEnv[name];
  }
});

for (const [provider, start, complete, accessField, refreshField, expiresField] of [
  [
    'MERCADO_PAGO',
    startMP,
    completeMP,
    'mercadoPagoAccessToken',
    'mercadoPagoRefreshToken',
    'mercadoPagoTokenExpiresAt',
  ],
  ['PAGBANK', startPB, completePB, 'pagbankToken', 'pagbankRefreshToken', 'pagbankTokenExpiresAt'],
]) {
  test(`${provider}: impede iniciar conexão incompleta antes de criar state`, async () => {
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    await assert.rejects(
      () => start.execute({ restaurantId: 7, userId: 11 }),
      /preparada pela plataforma/,
    );
    assert.equal(storedState, null);
    assert.equal(requests.length, 0);
  });
  test(`${provider}: conectar usa state opaco, escopos de produção, persiste grant e preserva formas selecionadas`, async () => {
    const { authorizationUrl } = await start.execute({ restaurantId: 7, userId: 11 });
    const params = new URL(authorizationUrl).searchParams;
    const state = params.get('state');
    assert.match(state, /^[a-f0-9]{64}$/);
    if (provider === 'MERCADO_PAGO') {
      assert.deepEqual(new Set(params.get('scope')?.split(' ')), new Set(['read', 'write', 'offline_access']));
    } else {
      const scopes = new Set(params.get('scope')?.split(' '));
      for (const required of [
        'payments.read',
        'payments.create',
        'payments.refund',
        'checkout.create',
        'checkout.view',
        'checkout.update',
      ]) {
        assert.equal(scopes.has(required), true);
      }
    }
    const before = Date.now();
    assert.deepEqual(await complete.execute({ code: 'authorization-code', state }), {
      restaurantId: 7,
      connected: true,
    });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].body.grant_type, 'authorization_code');
    assert.equal(requests[0].body.redirect_uri, params.get('redirect_uri'));
    assert.equal(requests[0].body.code, 'authorization-code');
    assert.equal(
      decryptCredential(settings[accessField], credentialEncryptionContext(7, accessField)),
      'seller-access',
    );
    assert.equal(
      decryptCredential(settings[refreshField], credentialEncryptionContext(7, refreshField)),
      'seller-refresh',
    );
    assert.ok(settings[expiresField].getTime() >= before + 3_600_000);
    assert.equal(settings.pixProvider, 'ASAAS');
    assert.equal(settings.cardGateway, 'PAGBANK');
    if (provider === 'PAGBANK') assert.equal(settings.pagbankEnvironment, 'production');
    else assert.equal(settings.mercadoPagoPublicKey, 'seller-public');
    await assert.rejects(
      () => complete.execute({ code: 'authorization-code', state }),
      /reutilizado/,
    );
    assert.equal(requests.length, 1);
  });

  test(`${provider}: recusa do usuário não altera credenciais nem expõe detalhes do provedor`, async () => {
    const { authorizationUrl } = await start.execute({ restaurantId: 7, userId: 11 });
    const state = new URL(authorizationUrl).searchParams.get('state');
    await assert.rejects(
      () =>
        complete.execute({
          state,
          providerError: 'denied-secret',
          providerErrorDescription: 'private-data',
        }),
      (error) =>
        /não autorizou/.test(error.message) && !/denied-secret|private-data/.test(error.message),
    );
    assert.equal(requests.length, 0);
    assert.deepEqual(settings, { restaurantId: 7, pixProvider: 'ASAAS', cardGateway: 'PAGBANK' });
  });
}
