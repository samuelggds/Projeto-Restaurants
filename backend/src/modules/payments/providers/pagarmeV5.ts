import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';

const API_BASE = 'https://api.pagar.me/core/v5';

function validKey(value: unknown, prefix: 'sk_' | 'pk_') {
  const key = String(value || '').trim();
  return key.startsWith(prefix) || key.startsWith(prefix.replace('_', '_test_'));
}

export function pagarmeEnvironmentFromKeys(secretKey: unknown, publicKey: unknown) {
  const secret = String(secretKey || '').trim();
  const pub = String(publicKey || '').trim();
  const sandbox = secret.startsWith('sk_test_') || pub.startsWith('pk_test_');
  return sandbox ? 'sandbox' : 'production';
}

export function validatePagarmeKeys(secretKey: unknown, publicKey: unknown) {
  const secret = String(secretKey || '').trim();
  const pub = String(publicKey || '').trim();
  if (!validKey(secret, 'sk_') || !validKey(pub, 'pk_')) {
    throw new Error('Informe as chaves Secret Key e Public Key válidas do Pagar.me.');
  }
  const secretSandbox = secret.startsWith('sk_test_');
  const publicSandbox = pub.startsWith('pk_test_');
  if (secretSandbox !== publicSandbox) {
    throw new Error('As chaves do Pagar.me precisam pertencer ao mesmo ambiente.');
  }
  const environment = secretSandbox ? ('sandbox' as const) : ('production' as const);
  return { secretKey: secret, publicKey: pub, environment };
}

export async function getRestaurantPagarmeCredentials(restaurantId: number) {
  const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);
  if (!settings) throw new Error('Configurações do restaurante não encontradas.');
  return validatePagarmeKeys(settings.pagarmeSecretKey, settings.pagarmePublicKey);
}

export function pagarmeAuthorization(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`, 'utf8').toString('base64')}`;
}

export async function pagarmeJson<T>(
  secretKey: string,
  path: string,
  init: RequestInit = {},
): Promise<{ response: Response; body: T }> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    redirect: 'error',
    signal: init.signal || AbortSignal.timeout(20_000),
    headers: {
      Authorization: pagarmeAuthorization(secretKey),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { response, body };
}

export function safePagarmeError(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback;
  const data = body as Record<string, unknown>;
  const message = String(data.message || data.error || fallback)
    .replace(/sk_(?:test_)?[A-Za-z0-9_-]+/gu, '[credencial protegida]')
    .replace(/pk_(?:test_)?[A-Za-z0-9_-]+/gu, '[chave pública]')
    .replace(/\b\d{13,19}\b/gu, '[cartão protegido]')
    .trim();
  return message.slice(0, 220) || fallback;
}
