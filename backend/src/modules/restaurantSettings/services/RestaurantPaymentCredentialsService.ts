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

export type RestaurantOAuthProvider = 'MERCADO_PAGO';

type TokenFields = {
  access: 'mercadoPagoAccessToken';
  refresh: 'mercadoPagoRefreshToken';
  expiry: 'mercadoPagoTokenExpiresAt';
  global: 'MP_ACCESS_TOKEN';
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
};

const REFRESH_MARGIN_MS = 60_000;

export type OAuthCredentialSet = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  publicKey?: string | null;
};

export function parseOAuthCredentials(
  body: Record<string, unknown>,
  now = Date.now(),
): OAuthCredentialSet {
  const accessToken = typeof body.access_token === 'string' ? body.access_token.trim() : '';
  if (!accessToken) {
    throw new Error('O provedor não retornou credenciais válidas. Conecte novamente.');
  }

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

function credentialsData(credentials: OAuthCredentialSet) {
  return {
    mercadoPagoAccessToken: credentials.accessToken,
    mercadoPagoRefreshToken: credentials.refreshToken,
    mercadoPagoTokenExpiresAt: credentials.expiresAt,
    mercadoPagoPublicKey: credentials.publicKey ?? null,
  } as Prisma.RestaurantSettingsUncheckedUpdateInput;
}

function reconnectError() {
  return new Error(
    'A conexão com Mercado Pago precisa ser renovada. Conecte a conta novamente em Configurações > Pagamentos.',
  );
}

async function withCredentialLock<T>(
  restaurantId: number,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('lock_timeout', '20s', true)`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${fields.MERCADO_PAGO.lockNamespace}::int, ${restaurantId}::int)::text`;
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
  if (provider !== 'MERCADO_PAGO') throw new Error('Provedor OAuth não suportado.');

  const data = encryptCredentialData(credentialsData(credentials), restaurantId);

  await withCredentialLock(restaurantId, async (tx) => {
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

async function requestRefresh(refreshToken: string) {
  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: String(
      process.env.MP_OAUTH_CLIENT_ID ||
        process.env.MP_CLIENT_ID ||
        process.env.MERCADO_PAGO_CLIENT_ID ||
        '',
    ).trim(),
    client_secret: String(
      process.env.MP_OAUTH_CLIENT_SECRET ||
        process.env.MP_CLIENT_SECRET ||
        process.env.MERCADO_PAGO_CLIENT_SECRET ||
        '',
    ).trim(),
  };

  if (!body.client_id || !body.client_secret) throw reconnectError();

  try {
    const response = await fetch(`${resolveOAuthEndpoint('MERCADO_PAGO_API')}/oauth/token`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw reconnectError();

    const credentials = parseOAuthCredentials(await response.json());
    if (!credentials.expiresAt || !credentials.refreshToken) throw reconnectError();
    return credentials;
  } catch {
    throw reconnectError();
  }
}

function reusableToken(row: RestaurantSettings) {
  const names = fields.MERCADO_PAGO;
  const token = readSecret(row, names.access);
  if (!token) return null;

  const expiresAt = row[names.expiry];
  if (!expiresAt && !readSecret(row, names.refresh)) return token;
  if (expiresAt && expiresAt.getTime() > Date.now() + REFRESH_MARGIN_MS) return token;
  return null;
}

async function getAccessToken(restaurantId: number): Promise<string> {
  validRestaurantId(restaurantId);

  const names = fields.MERCADO_PAGO;
  const existing = await restaurantSettingsRepository.findByRestaurantId(restaurantId);

  if (!existing || !readSecret(existing, names.access)) {
    const global =
      process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK === 'true'
        ? String(process.env[names.global] || '').trim()
        : '';
    if (global) return global;
    throw new Error('Mercado Pago ainda não foi conectado neste restaurante.');
  }

  const reusable = reusableToken(existing);
  if (reusable) return reusable;

  return withCredentialLock(restaurantId, async (tx) => {
    const row = await tx.restaurantSettings.findUnique({ where: { restaurantId } });
    if (!row) throw reconnectError();

    const latestToken = reusableToken(row);
    if (latestToken) return latestToken;

    const refreshToken = readSecret(row, names.refresh);
    if (!refreshToken) throw reconnectError();

    const refreshed = await requestRefresh(refreshToken);
    refreshed.publicKey ??= row.mercadoPagoPublicKey;

    const data = encryptCredentialData(credentialsData(refreshed), restaurantId);
    const updated = await tx.restaurantSettings.updateMany({
      where: {
        restaurantId,
        mercadoPagoAccessToken: row.mercadoPagoAccessToken,
        mercadoPagoRefreshToken: row.mercadoPagoRefreshToken,
      },
      data,
    });

    if (updated.count !== 1) {
      const changed = await tx.restaurantSettings.findUnique({ where: { restaurantId } });
      const token = changed && reusableToken(changed);
      if (token) return token;
      throw reconnectError();
    }

    return refreshed.accessToken;
  });
}

export function getMercadoPagoAccessToken(restaurantId: number) {
  return getAccessToken(restaurantId);
}
