// @ts-nocheck
import assert from 'node:assert/strict';
import test, { beforeEach, afterEach } from 'node:test';
import prisma from '../../../config/prisma.js';
import startMP from './StartMercadoPagoOAuthService.js';
import completeMP from './CompleteMercadoPagoOAuthService.js';
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
  'CREDENTIAL_ENCRYPTION_KEY',
  'BACKEND_URL',
  'FRONTEND_URL',
  'MP_WEBHOOK_SECRET',
  'MP_WEBHOOK_SECRETS',
  'MP_ORDER_NOTIFICATION_URL',
  'MP_OAUTH_REDIRECT_URI',
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
  process.env.CREDENTIAL_ENCRYPTION_KEY = 'ab'.repeat(32);
  process.env.BACKEND_URL = 'https://api.example.test';
  process.env.FRONTEND_URL = 'https://example.test';
  process.env.MP_WEBHOOK_SECRET = 'fake-webhook-secret';
  delete process.env.MP_WEBHOOK_SECRETS;
  delete process.env.MP_ORDER_NOTIFICATION_URL;
  delete process.env.MP_OAUTH_REDIRECT_URI;

  storedState = null;
  settings = {
    restaurantId: 7,
    pixProvider: 'MERCADO_PAGO',
    cardGateway: 'MERCADO_PAGO',
  };
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
    ) {
      return { count: 0 };
    }
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

test('Mercado Pago impede iniciar conexão incompleta antes de criar state', async () => {
  delete process.env.CREDENTIAL_ENCRYPTION_KEY;

  await assert.rejects(
    () => startMP.execute({ restaurantId: 7, userId: 11 }),
    /preparada pela plataforma/,
  );

  assert.equal(storedState, null);
  assert.equal(requests.length, 0);
});

test('Mercado Pago usa state opaco, persiste grant e preserva seleção ativa', async () => {
  const { authorizationUrl } = await startMP.execute({ restaurantId: 7, userId: 11 });
  const params = new URL(authorizationUrl).searchParams;
  const state = params.get('state');

  assert.match(state, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    new Set(params.get('scope')?.split(' ')),
    new Set(['read', 'write', 'offline_access']),
  );

  const before = Date.now();
  assert.deepEqual(await completeMP.execute({ code: 'authorization-code', state }), {
    restaurantId: 7,
    connected: true,
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.grant_type, 'authorization_code');
  assert.equal(requests[0].body.redirect_uri, params.get('redirect_uri'));
  assert.equal(requests[0].body.code, 'authorization-code');

  assert.equal(
    decryptCredential(
      settings.mercadoPagoAccessToken,
      credentialEncryptionContext(7, 'mercadoPagoAccessToken'),
    ),
    'seller-access',
  );
  assert.equal(
    decryptCredential(
      settings.mercadoPagoRefreshToken,
      credentialEncryptionContext(7, 'mercadoPagoRefreshToken'),
    ),
    'seller-refresh',
  );
  assert.ok(settings.mercadoPagoTokenExpiresAt.getTime() >= before + 3_600_000);
  assert.equal(settings.mercadoPagoPublicKey, 'seller-public');
  assert.equal(settings.pixProvider, 'MERCADO_PAGO');
  assert.equal(settings.cardGateway, 'MERCADO_PAGO');

  await assert.rejects(
    () => completeMP.execute({ code: 'authorization-code', state }),
    /reutilizado/,
  );
  assert.equal(requests.length, 1);
});

test('recusa do usuário não altera credenciais nem expõe detalhes do provedor', async () => {
  const { authorizationUrl } = await startMP.execute({ restaurantId: 7, userId: 11 });
  const state = new URL(authorizationUrl).searchParams.get('state');

  await assert.rejects(
    () =>
      completeMP.execute({
        state,
        providerError: 'denied-secret',
        providerErrorDescription: 'private-data',
      }),
    (error) =>
      /não autorizou/.test(error.message) &&
      !/denied-secret|private-data/.test(error.message),
  );

  assert.equal(requests.length, 0);
  assert.deepEqual(settings, {
    restaurantId: 7,
    pixProvider: 'MERCADO_PAGO',
    cardGateway: 'MERCADO_PAGO',
  });
});
