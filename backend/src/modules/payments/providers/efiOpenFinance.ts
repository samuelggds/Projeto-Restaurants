import crypto from 'node:crypto';
import https from 'node:https';
import axios, { type AxiosRequestConfig } from 'axios';

type OAuthResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

export type EfiOpenFinanceParticipant = {
  identificador?: string;
  nome?: string;
  descricao?: string;
  portal?: string;
  logo?: string;
  organizacoes?: Array<{ nome?: string; cnpj?: string; status?: string }>;
};

export type EfiOpenFinancePayment = {
  identificadorPagamento?: string;
  endToEndId?: string;
  valor?: string | number;
  status?: string;
  dataCriacao?: string;
  idProprio?: string;
  motivo?: string;
  tipo?: string;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function env(name: string) {
  return String(process.env[name] || '').trim();
}

export function efiOpenFinanceEnabled() {
  return env('EFI_OPEN_FINANCE_ENABLED').toLowerCase() === 'true';
}

export function efiOpenFinanceEnvironment() {
  return env('EFI_OPEN_FINANCE_ENV').toLowerCase() === 'production'
    ? 'production'
    : 'homologation';
}

export function efiOpenFinanceBaseUrl() {
  const explicit = env('EFI_OPEN_FINANCE_BASE_URL').replace(/\/+$/, '');
  if (explicit) return explicit;
  return efiOpenFinanceEnvironment() === 'production'
    ? 'https://openfinance.api.efipay.com.br'
    : 'https://openfinance-h.api.efipay.com.br';
}

function decodedBase64(name: string) {
  const value = env(name);
  if (!value) return null;
  return Buffer.from(value, 'base64');
}

function httpsAgent() {
  const pfx = decodedBase64('EFI_OPEN_FINANCE_P12_BASE64');
  if (pfx?.length) {
    return new https.Agent({
      pfx,
      passphrase: env('EFI_OPEN_FINANCE_P12_PASSPHRASE') || undefined,
      keepAlive: true,
      minVersion: 'TLSv1.2',
    });
  }

  const cert = decodedBase64('EFI_OPEN_FINANCE_CERT_BASE64');
  const key = decodedBase64('EFI_OPEN_FINANCE_KEY_BASE64');
  if (cert?.length && key?.length) {
    return new https.Agent({
      cert,
      key,
      keepAlive: true,
      minVersion: 'TLSv1.2',
    });
  }

  throw new Error('Certificado mTLS da Efí Open Finance não configurado.');
}

export function efiOpenFinanceConfigured() {
  if (!efiOpenFinanceEnabled()) return false;
  if (!env('EFI_OPEN_FINANCE_CLIENT_ID') || !env('EFI_OPEN_FINANCE_CLIENT_SECRET')) return false;
  if (
    !env('EFI_OPEN_FINANCE_P12_BASE64') &&
    !(env('EFI_OPEN_FINANCE_CERT_BASE64') && env('EFI_OPEN_FINANCE_KEY_BASE64'))
  ) {
    return false;
  }
  if (!env('EFI_OPEN_FINANCE_WEBHOOK_HMAC')) return false;
  return true;
}

async function accessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const clientId = env('EFI_OPEN_FINANCE_CLIENT_ID');
  const clientSecret = env('EFI_OPEN_FINANCE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Credenciais da Efí Open Finance não configuradas.');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64');
  const response = await axios.post<OAuthResponse>(
    `${efiOpenFinanceBaseUrl()}/v1/oauth/token`,
    { grant_type: 'client_credentials' },
    {
      timeout: 15_000,
      maxRedirects: 0,
      httpsAgent: httpsAgent(),
      validateStatus: () => true,
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  );

  const token = String(response.data?.access_token || '').trim();
  if (response.status < 200 || response.status >= 300 || !token) {
    throw new Error('A Efí não autorizou a aplicação Open Finance.');
  }

  const expiresIn = Number(response.data?.expires_in || 3600);
  tokenCache = {
    token,
    expiresAt:
      Date.now() + Math.max(60, Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
  };
  return token;
}

export async function efiOpenFinanceRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  options: {
    data?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
) {
  const token = await accessToken();
  const request: AxiosRequestConfig = {
    method,
    url: `${efiOpenFinanceBaseUrl()}${path}`,
    data: options.data,
    params: options.params,
    timeout: options.timeoutMs || 15_000,
    maxRedirects: 0,
    httpsAgent: httpsAgent(),
    validateStatus: () => true,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  const response = await axios.request<T>(request);
  return { status: response.status, data: response.data };
}

export function efiOpenFinancePaymentId(identifier: string) {
  const normalized = String(identifier || '').trim();
  if (!normalized) throw new Error('Identificador Efí Open Finance inválido.');
  return `efi_open_finance:${normalized}`;
}

export function parseEfiOpenFinancePaymentId(paymentId: string) {
  const normalized = String(paymentId || '').trim();
  const prefix = 'efi_open_finance:';
  return normalized.toLowerCase().startsWith(prefix)
    ? normalized.slice(prefix.length).trim()
    : '';
}

export function efiOpenFinanceOrderReference(restaurantId: number, orderId: number) {
  return `orderpix:${restaurantId}:${orderId}`;
}

export function efiOpenFinanceIdempotencyKey(restaurantId: number, orderId: number) {
  const digest = crypto
    .createHash('sha256')
    .update(`gastronexa:efi-open-finance:${restaurantId}:${orderId}`)
    .digest('hex');
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20, 32)}`;
}

export function validEfiWebhookHmac(candidate: unknown) {
  const expected = env('EFI_OPEN_FINANCE_WEBHOOK_HMAC');
  const received = String(candidate || '').trim();
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function efiOpenFinanceRedirectUrl() {
  const backend = env('BACKEND_URL').replace(/\/+$/, '');
  if (!/^https:\/\//iu.test(backend)) {
    throw new Error('BACKEND_URL HTTPS é obrigatório para o retorno Open Finance.');
  }
  return `${backend}/orders/open-finance/efi/return`;
}

export function efiOpenFinanceWebhookUrl() {
  const backend = env('BACKEND_URL').replace(/\/+$/, '');
  if (!/^https:\/\//iu.test(backend)) {
    throw new Error('BACKEND_URL HTTPS é obrigatório para o webhook Open Finance.');
  }
  return `${backend}/orders/webhook/efi-open-finance`;
}

export async function findEfiOpenFinancePayment({
  identifier,
  reference,
  createdAt,
}: {
  identifier: string;
  reference: string;
  createdAt?: Date | string | null;
}) {
  const anchor = createdAt ? new Date(createdAt) : new Date();
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const start = new Date(safeAnchor);
  const end = new Date(safeAnchor);
  start.setUTCDate(start.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 1);
  const isoDate = (value: Date) => value.toISOString().slice(0, 10);

  for (let page = 1; page <= 5; page += 1) {
    const result = await efiOpenFinanceRequest<{ pagamentos?: EfiOpenFinancePayment[]; total?: number }>(
      'GET',
      '/v1/pagamentos/pix',
      {
        params: {
          inicio: isoDate(start),
          fim: isoDate(end),
          quantidade: 100,
          pagina: page,
        },
      },
    );
    if (result.status === 404) return null;
    if (result.status < 200 || result.status >= 300) {
      throw new Error('Não foi possível consultar o pagamento Open Finance na Efí.');
    }
    const payments = Array.isArray(result.data?.pagamentos) ? result.data.pagamentos : [];
    const found = payments.find(
      (payment) =>
        String(payment.identificadorPagamento || '').trim() === identifier &&
        String(payment.idProprio || '').trim() === reference,
    );
    if (found) return found;
    if (payments.length < 100) break;
  }

  return null;
}
