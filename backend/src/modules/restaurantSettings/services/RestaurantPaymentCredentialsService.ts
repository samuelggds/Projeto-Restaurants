import type { Prisma, RestaurantSettings } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import restaurantSettingsRepository, {
  encryptCredentialData,
} from '../repositories/RestaurantSettingsRepository.js';
import {
  credentialEncryptionContext,
  decryptCredential,
} from '../security/credentialEncryption.js';
import { resolveOAuthEndpoint } from '../security/oauthEndpoints.js';

export type RestaurantOAuthProvider = 'MERCADO_PAGO' | 'PAGBANK';
type TokenFields = {
  access: 'mercadoPagoAccessToken' | 'pagbankToken';
  refresh: 'mercadoPagoRefreshToken' | 'pagbankRefreshToken';
  expiry: 'mercadoPagoTokenExpiresAt' | 'pagbankTokenExpiresAt';
  global: 'MP_ACCESS_TOKEN' | 'PAGBANK_TOKEN';
  label: string;
  lockNamespace: number;
};
const fields: Record<RestaurantOAuthProvider, TokenFields> = {
  MERCADO_PAGO: {
    access: 'mercadoPagoAccessToken',
    refresh: 'mercadoPagoRefreshToken',
    expiry: 'mercadoPagoTokenExpiresAt',
    global: 'MP_ACCESS_TOKEN',
    label: 'Mercado Pago',
    lockNamespace: 71301,
  },
  PAGBANK: {
    access: 'pagbankToken',
    refresh: 'pagbankRefreshToken',
    expiry: 'pagbankTokenExpiresAt',
    global: 'PAGBANK_TOKEN',
    label: 'PagBank',
    lockNamespace: 71302,
  },
};
const REFRESH_MARGIN_MS = 60_000;

export type OAuthCredentialSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  publicKey?: string | null;
  environment?: 'sandbox' | 'production';
};

export function parseOAuthCredentials(
  body: Record<string, unknown>,
  now = Date.now(),
): OAuthCredentialSet {
  const accessToken = typeof body.access_token === 'string' ? body.access_token.trim() : '';
  if (!accessToken)
    throw new Error('O provedor não retornou credenciais válidas. Conecte novamente.');
  const seconds = Number(body.expires_in);
  const expiration = now + seconds * 1_000;
  const expiresAt =
    Number.isFinite(seconds) &&
    seconds > 0 &&
    Number.isFinite(expiration) &&
    expiration <= 8_640_000_000_000_000
      ? new Date(expiration)
      : null;
  return {
    accessToken,
    refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token.trim() || null : null,
    expiresAt,
    publicKey: typeof body.public_key === 'string' ? body.public_key.trim() || null : null,
  };
}

function validRestaurantId(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647) {
    throw new Error('Restaurante inválido para consultar credenciais de pagamento.');
  }
  return value;
}

function readSecret(
  row: RestaurantSettings,
  field: TokenFields['access'] | TokenFields['refresh'],
) {
  return String(
    decryptCredential(row[field], credentialEncryptionContext(row.restaurantId, field)) || '',
  ).trim();
}

function credentialsData(provider: RestaurantOAuthProvider, credentials: OAuthCredentialSet) {
  const names = fields[provider];
  return {
    [names.access]: credentials.accessToken,
    [names.refresh]: credentials.refreshToken,
    [names.expiry]: credentials.expiresAt,
    ...(provider === 'MERCADO_PAGO' ? { mercadoPagoPublicKey: credentials.publicKey ?? null } : {}),
    ...(provider === 'PAGBANK' ? { pagbankEnvironment: credentials.environment ?? null } : {}),
  } as Prisma.RestaurantSettingsUncheckedUpdateInput;
}

function reconnectError(provider: RestaurantOAuthProvider) {
  return new Error(
    `A conexão com ${fields[provider].label} precisa ser renovada. Conecte a conta novamente em Configurações > Pagamentos.`,
  );
}

/** Dedicated, bounded transaction: the provider rotates refresh tokens once.
 * A PostgreSQL transaction lock serializes all replicas and is released even if
 * a process dies. Read and write use that same connection. Normal payments
 * and callbacks never hold this lock while making a money transaction.
 */
async function withCredentialLock<T>(
  restaurantId: number,
  provider: RestaurantOAuthProvider,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('lock_timeout', '20s', true)`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${fields[provider].lockNamespace}::int, ${restaurantId}::int)::text`;
      return callback(tx);
    },
    { maxWait: 5_000, timeout: 40_000 },
  );
}

export async function saveRestaurantOAuthCredentials(
  restaurantId: number,
  provider: RestaurantOAuthProvider,
  credentials: OAuthCredentialSet,
) {
  validRestaurantId(restaurantId);
  const data = encryptCredentialData(credentialsData(provider, credentials), restaurantId);
  await withCredentialLock(restaurantId, provider, async (tx) => {
    // Saving a connection must not silently change the selected Pix/card
    // providers. Missing refresh/expiry explicitly clear a previous grant.
    await tx.restaurantSettings.upsert({
      where: { restaurantId },
      update: data,
      create: {
        restaurantId,
        deliveryFee: 0,
        minimumOrder: 0,
        ...data,
      } as Prisma.RestaurantSettingsUncheckedCreateInput,
    });
  });
}

async function requestRefresh(provider: RestaurantOAuthProvider, refreshToken: string) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const body: Record<string, string> = { grant_type: 'refresh_token', refresh_token: refreshToken };
  let url: string;
  if (provider === 'MERCADO_PAGO') {
    body.client_id = String(
      process.env.MP_OAUTH_CLIENT_ID ||
        process.env.MP_CLIENT_ID ||
        process.env.MERCADO_PAGO_CLIENT_ID ||
        '',
    ).trim();
    body.client_secret = String(
      process.env.MP_OAUTH_CLIENT_SECRET ||
        process.env.MP_CLIENT_SECRET ||
        process.env.MERCADO_PAGO_CLIENT_SECRET ||
        '',
    ).trim();
    if (!body.client_id || !body.client_secret) throw reconnectError(provider);
    url = `${resolveOAuthEndpoint('MERCADO_PAGO_API')}/oauth/token`;
  } else {
    const platformToken = String(process.env.PAGBANK_CONNECT_PLATFORM_TOKEN || '').trim();
    headers.X_CLIENT_ID = String(process.env.PAGBANK_CONNECT_CLIENT_ID || '').trim();
    headers.X_CLIENT_SECRET = String(process.env.PAGBANK_CONNECT_CLIENT_SECRET || '').trim();
    if (!platformToken || !headers.X_CLIENT_ID || !headers.X_CLIENT_SECRET)
      throw reconnectError(provider);
    headers.Authorization = `Bearer ${platformToken}`;
    url = `${resolveOAuthEndpoint('PAGBANK_API')}/oauth2/refresh`;
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) throw reconnectError(provider);
    const credentials = parseOAuthCredentials(await response.json());
    if (!credentials.expiresAt || !credentials.refreshToken) throw reconnectError(provider);
    return credentials;
  } catch {
    // Never propagate provider payloads, tokens or network request details.
    throw reconnectError(provider);
  }
}

function reusableToken(row: RestaurantSettings, provider: RestaurantOAuthProvider) {
  const names = fields[provider];
  const token = readSecret(row, names.access);
  if (!token) return null;
  const expiresAt = row[names.expiry];
  // A manually supplied token has no refresh grant. Existing installations
  // without OAuth expiry metadata remain usable until explicitly reconnected.
  if (!expiresAt && !readSecret(row, names.refresh)) return token;
  if (expiresAt && expiresAt.getTime() > Date.now() + REFRESH_MARGIN_MS) return token;
  return null;
}

async function getAccessToken(
  restaurantId: number,
  provider: RestaurantOAuthProvider,
): Promise<string> {
  validRestaurantId(restaurantId);
  const names = fields[provider];
  const existing = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  if (!existing || !readSecret(existing, names.access)) {
    const global =
      process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true'
        ? String(process.env[names.global] || '').trim()
        : '';
    if (global) return global;
    throw new Error(`${names.label} ainda não foi conectado neste restaurante.`);
  }
  const reusable = reusableToken(existing, provider);
  if (reusable) return reusable;
  return withCredentialLock(restaurantId, provider, async (tx) => {
    const row = await tx.restaurantSettings.findUnique({ where: { restaurantId } });
    if (!row) throw reconnectError(provider);
    const latestToken = reusableToken(row, provider);
    if (latestToken) return latestToken;
    const refreshToken = readSecret(row, names.refresh);
    if (!refreshToken) throw reconnectError(provider);
    const refreshed = await requestRefresh(provider, refreshToken);
    refreshed.publicKey ??= row.mercadoPagoPublicKey;
    if (provider === 'PAGBANK')
      refreshed.environment = row.pagbankEnvironment === 'sandbox' ? 'sandbox' : 'production';
    const data = encryptCredentialData(credentialsData(provider, refreshed), restaurantId);
    const updated = await tx.restaurantSettings.updateMany({
      where: {
        restaurantId,
        [names.access]: row[names.access],
        [names.refresh]: row[names.refresh],
      },
      data,
    });
    // A concurrent manual credential change doesn't participate in this lock.
    // Its credentials win; never restore the old account over that change.
    if (updated.count !== 1) {
      const changed = await tx.restaurantSettings.findUnique({ where: { restaurantId } });
      const token = changed && reusableToken(changed, provider);
      if (token) return token;
      throw reconnectError(provider);
    }
    return refreshed.accessToken;
  });
}

export function getPagBankAccessToken(restaurantId: number) {
  return getAccessToken(restaurantId, 'PAGBANK');
}

export function getMercadoPagoAccessToken(restaurantId: number) {
  return getAccessToken(restaurantId, 'MERCADO_PAGO');
}
