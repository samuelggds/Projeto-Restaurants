import crypto from 'node:crypto';

export type BelvoEnvironment = 'sandbox' | 'production';

function enabled() {
  return String(process.env.BELVO_PAYMENTS_ENABLED || 'false').trim().toLowerCase() === 'true';
}

function credentials() {
  const secretId = String(process.env.BELVO_SECRET_ID || '').trim();
  const secretPassword = String(process.env.BELVO_SECRET_PASSWORD || '').trim();
  const webhookToken = String(process.env.BELVO_WEBHOOK_TOKEN || '').trim();
  if (
    !enabled() ||
    !secretId ||
    !secretPassword ||
    (process.env.NODE_ENV === 'production' && webhookToken.length < 32)
  ) {
    throw new Error('Pix via Open Finance ainda não está disponível.');
  }
  return { secretId, secretPassword };
}

export function belvoEnvironment(): BelvoEnvironment {
  return String(process.env.BELVO_ENV || 'sandbox').trim().toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

export function belvoBaseUrl() {
  return belvoEnvironment() === 'production'
    ? 'https://api.belvo.com'
    : 'https://sandbox.belvo.com';
}

export function isBelvoOpenFinanceConfigured() {
  try {
    credentials();
    return true;
  } catch {
    return false;
  }
}

function authorization() {
  const { secretId, secretPassword } = credentials();
  return `Basic ${Buffer.from(`${secretId}:${secretPassword}`, 'utf8').toString('base64')}`;
}

export async function belvoJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${belvoBaseUrl()}${path}`, {
    ...init,
    redirect: 'error',
    signal: init.signal || AbortSignal.timeout(15_000),
    headers: {
      Authorization: authorization(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Belvo-API-Resource-Version': 'Payments-BR.V2',
      ...(init.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { response, body };
}

export function belvoIdempotencyKey(seed: string) {
  const normalized = String(seed || '').trim();
  if (!normalized) return crypto.randomUUID();
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

export function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    String(value || '').trim(),
  );
}

export function normalizePixKey(value: unknown) {
  const key = String(value || '').trim();
  if (!key || key.length > 120) throw new Error('Cadastre uma chave Pix válida do restaurante.');
  return key;
}

export function safeBelvoError(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback;
  const data = body as Record<string, unknown>;
  const candidate =
    (Array.isArray(data) && data[0] && typeof data[0] === 'object'
      ? String((data[0] as Record<string, unknown>).message || '')
      : '') ||
    String(data.message || data.detail || data.error || '');
  const sanitized = candidate
    .replace(/[A-Za-z0-9_-]{32,}/gu, '[identificador protegido]')
    .trim();
  return (sanitized || fallback).slice(0, 220);
}
