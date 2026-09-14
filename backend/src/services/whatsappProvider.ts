type FetchLike = typeof fetch;

export type WhatsAppDeliveryProvider = 'none' | 'whatsapp_webhook' | 'gupshup';

export class WhatsAppProviderConfigurationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WhatsAppProviderConfigurationError';
    this.code = code;
  }
}

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function configuredGupshupEndpoint() {
  const raw = env('GUPSHUP_API_URL') || 'https://api.gupshup.io/wa/api/v1/msg';
  const url = new URL(raw);
  const localHttp =
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (url.username || url.password || (url.protocol !== 'https:' && !localHttp)) {
    throw new WhatsAppProviderConfigurationError(
      'invalid_gupshup_url',
      'GUPSHUP_API_URL deve usar HTTPS.',
    );
  }

  return url;
}

function parseAppBySourceMap() {
  const raw = env('GUPSHUP_APP_BY_SOURCE_JSON');
  if (!raw) return {} as Record<string, string>;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('invalid map');
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .map(([source, appName]) => [digitsOnly(source), String(appName || '').trim()] as const)
        .filter(([source, appName]) => Boolean(source && appName)),
    );
  } catch {
    throw new WhatsAppProviderConfigurationError(
      'invalid_gupshup_app_map',
      'GUPSHUP_APP_BY_SOURCE_JSON deve ser um objeto JSON válido.',
    );
  }
}

export function resolveWhatsAppDeliveryProvider(): string {
  const explicit = env('CUSTOMER_NOTIFICATION_PROVIDER').toLowerCase();
  if (explicit) return explicit;
  if (env('WHATSAPP_WEBHOOK_URL')) return 'whatsapp_webhook';
  if (env('GUPSHUP_API_KEY')) return 'gupshup';
  return 'none';
}

export function resolveGupshupAppName(source: string) {
  const normalizedSource = digitsOnly(source);
  const appBySource = parseAppBySourceMap();
  const mappedApp = String(appBySource[normalizedSource] || '').trim();
  if (mappedApp) return mappedApp;

  const fallback = env('GUPSHUP_APP_NAME');
  if (fallback) return fallback;

  throw new WhatsAppProviderConfigurationError(
    'gupshup_app_not_mapped',
    'Nenhum app Gupshup foi configurado para o número de origem.',
  );
}

export async function sendGupshupTextMessage({
  source,
  destination,
  message,
  send = fetch,
}: {
  source: string;
  destination: string;
  message: string;
  send?: FetchLike;
}) {
  const apiKey = env('GUPSHUP_API_KEY');
  if (!apiKey) {
    throw new WhatsAppProviderConfigurationError(
      'gupshup_api_key_missing',
      'GUPSHUP_API_KEY não configurada.',
    );
  }

  const normalizedSource = digitsOnly(source);
  const normalizedDestination = digitsOnly(destination);
  if (!/^\d{10,15}$/u.test(normalizedSource)) {
    throw new WhatsAppProviderConfigurationError(
      'invalid_gupshup_source',
      'Número de origem inválido para a Gupshup.',
    );
  }
  if (!/^\d{10,15}$/u.test(normalizedDestination)) {
    throw new WhatsAppProviderConfigurationError(
      'invalid_gupshup_destination',
      'Número de destino inválido para a Gupshup.',
    );
  }

  const endpoint = configuredGupshupEndpoint();
  const appName = resolveGupshupAppName(normalizedSource);
  const form = new URLSearchParams({
    channel: 'whatsapp',
    source: normalizedSource,
    destination: normalizedDestination,
    message: JSON.stringify({ type: 'text', text: String(message || '') }),
    'src.name': appName,
  });

  const response = await send(endpoint, {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: apiKey,
    },
    body: form,
  });

  await response.body?.cancel();
  if (!response.ok) {
    throw new Error(`Gupshup recusou a notificação com HTTP ${response.status}.`);
  }

  return { sent: true, provider: 'gupshup' } as const;
}
