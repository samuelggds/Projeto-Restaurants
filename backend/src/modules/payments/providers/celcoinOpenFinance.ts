import https from 'node:https';
import axios, { type AxiosRequestConfig } from 'axios';

type CelcoinToken = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function env(name: string) {
  return String(process.env[name] || '').trim();
}

export function celcoinItpEnabled() {
  return env('CELCOIN_ITP_ENABLED').toLowerCase() === 'true';
}

export function celcoinEnvironment() {
  return env('CELCOIN_ITP_ENV').toLowerCase() === 'production' ? 'production' : 'sandbox';
}

export function celcoinBaseUrl() {
  const explicit = env('CELCOIN_API_BASE_URL').replace(/\/+$/, '');
  if (explicit) return explicit;
  return celcoinEnvironment() === 'production'
    ? 'https://api.openfinance.celcoin.com.br'
    : 'https://sandbox.openfinance.celcoin.dev';
}

function decodeBase64Env(name: string) {
  const value = env(name);
  if (!value) return '';
  return Buffer.from(value, 'base64').toString('utf8');
}

function celcoinHttpsAgent() {
  const cert = decodeBase64Env('CELCOIN_MTLS_CERT_BASE64');
  const key = decodeBase64Env('CELCOIN_MTLS_KEY_BASE64');

  if (celcoinEnvironment() === 'production' && (!cert || !key)) {
    throw new Error('Certificado mTLS da Celcoin não configurado para produção.');
  }

  return cert && key
    ? new https.Agent({
        cert,
        key,
        keepAlive: true,
        minVersion: 'TLSv1.2',
      })
    : undefined;
}

export function isCelcoinOpenFinanceConfigured() {
  if (!celcoinItpEnabled()) return false;
  if (!env('CELCOIN_CLIENT_ID') || !env('CELCOIN_CLIENT_SECRET')) return false;
  if (!/^\d{14}$/.test(env('CELCOIN_ITP_CNPJ_INITIATOR'))) return false;
  if (!env('CELCOIN_WEBHOOK_SECRET')) return false;
  if (
    celcoinEnvironment() === 'production' &&
    (!env('CELCOIN_MTLS_CERT_BASE64') || !env('CELCOIN_MTLS_KEY_BASE64'))
  ) {
    return false;
  }
  return true;
}

async function applicationToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const clientId = env('CELCOIN_CLIENT_ID');
  const clientSecret = env('CELCOIN_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais Celcoin Open Finance não configuradas.');
  }

  const form = new FormData();
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);
  form.set('grant_type', 'client_credentials');

  const response = await axios.post<CelcoinToken>(`${celcoinBaseUrl()}/v5/token`, form, {
    timeout: 15_000,
    maxRedirects: 0,
    httpsAgent: celcoinHttpsAgent(),
    headers: { Accept: 'application/json' },
    validateStatus: () => true,
  });

  const token = String(response.data?.access_token || '').trim();
  if (response.status < 200 || response.status >= 300 || !token) {
    throw new Error('Celcoin não autenticou a aplicação de Open Finance.');
  }

  const expiresIn = Number(response.data?.expires_in || 300);
  tokenCache = {
    token,
    expiresAt: Date.now() + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : 300) * 1000,
  };
  return token;
}

export async function celcoinJson<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  config: {
    data?: unknown;
    params?: Record<string, unknown>;
    timeoutMs?: number;
  } = {},
): Promise<{ status: number; data: T }> {
  const token = await applicationToken();
  const request: AxiosRequestConfig = {
    method,
    url: `${celcoinBaseUrl()}${path}`,
    data: config.data,
    params: config.params,
    timeout: config.timeoutMs || 15_000,
    maxRedirects: 0,
    httpsAgent: celcoinHttpsAgent(),
    validateStatus: () => true,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };
  const response = await axios.request<T>(request);
  return { status: response.status, data: response.data };
}

export function celcoinWebhookSecret() {
  const secret = env('CELCOIN_WEBHOOK_SECRET');
  if (!secret) throw new Error('CELCOIN_WEBHOOK_SECRET não configurado.');
  return secret;
}

export function celcoinInitiatorCnpj() {
  const value = env('CELCOIN_ITP_CNPJ_INITIATOR').replace(/\D/g, '');
  if (!/^\d{14}$/.test(value)) {
    throw new Error('CNPJ iniciador da Celcoin não configurado.');
  }
  return value;
}

export function celcoinCallbackUrl() {
  const backend = env('BACKEND_URL').replace(/\/+$/, '');
  if (!/^https:\/\//i.test(backend)) {
    throw new Error('BACKEND_URL HTTPS é obrigatório para o callback Open Finance.');
  }
  return `${backend}/orders/open-finance/callback`;
}
