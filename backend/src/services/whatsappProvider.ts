type FetchLike = typeof fetch;

export type WhatsAppDeliveryProvider = 'none' | 'whatsapp_webhook' | 'gupshup';
export type GupshupTemplateKey =
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_PENDING'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED';
export type GupshupAutomaticTemplateMode = 'prefer' | 'required' | 'disabled';

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

function configuredEndpoint(name: string, fallback: string) {
  const raw = env(name) || fallback;
  const url = new URL(raw);
  const localHttp =
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (url.username || url.password || (url.protocol !== 'https:' && !localHttp)) {
    throw new WhatsAppProviderConfigurationError(
      'invalid_gupshup_url',
      `${name} deve usar HTTPS.`,
    );
  }

  return url;
}

function configuredGupshupEndpoint() {
  return configuredEndpoint('GUPSHUP_API_URL', 'https://api.gupshup.io/wa/api/v1/msg');
}

function configuredGupshupTemplateEndpoint() {
  return configuredEndpoint(
    'GUPSHUP_TEMPLATE_API_URL',
    'https://api.gupshup.io/wa/api/v1/template/msg',
  );
}

function parseAppBySourceMap() {
  const raw = env('GUPSHUP_APP_BY_SOURCE_JSON');
  if (!raw) return {} as Record<string, string>;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid map');

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

function parseTemplateBySourceMap() {
  const raw = env('GUPSHUP_TEMPLATE_BY_SOURCE_JSON');
  if (!raw) return {} as Record<string, Partial<Record<GupshupTemplateKey, string>>>;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid map');

    const normalized: Record<string, Partial<Record<GupshupTemplateKey, string>>> = {};
    for (const [source, value] of Object.entries(parsed as Record<string, unknown>)) {
      const normalizedSource = digitsOnly(source);
      if (!normalizedSource || !value || Array.isArray(value) || typeof value !== 'object') continue;
      const templates = value as Record<string, unknown>;
      normalized[normalizedSource] = {
        PAYMENT_CONFIRMED: String(templates.PAYMENT_CONFIRMED || '').trim(),
        ORDER_PENDING: String(templates.ORDER_PENDING || '').trim(),
        ORDER_PREPARING: String(templates.ORDER_PREPARING || '').trim(),
        ORDER_READY: String(templates.ORDER_READY || '').trim(),
        ORDER_OUT_FOR_DELIVERY: String(templates.ORDER_OUT_FOR_DELIVERY || '').trim(),
        ORDER_DELIVERED: String(templates.ORDER_DELIVERED || '').trim(),
        ORDER_CANCELLED: String(templates.ORDER_CANCELLED || '').trim(),
      };
    }
    return normalized;
  } catch {
    throw new WhatsAppProviderConfigurationError(
      'invalid_gupshup_template_map',
      'GUPSHUP_TEMPLATE_BY_SOURCE_JSON deve ser um objeto JSON válido.',
    );
  }
}

function requireApiKey() {
  const apiKey = env('GUPSHUP_API_KEY');
  if (!apiKey) {
    throw new WhatsAppProviderConfigurationError(
      'gupshup_api_key_missing',
      'GUPSHUP_API_KEY não configurada.',
    );
  }
  return apiKey;
}

function normalizedPhone(value: string, kind: 'source' | 'destination') {
  const normalized = digitsOnly(value);
  if (!/^\d{10,15}$/u.test(normalized)) {
    throw new WhatsAppProviderConfigurationError(
      kind === 'source' ? 'invalid_gupshup_source' : 'invalid_gupshup_destination',
      kind === 'source'
        ? 'Número de origem inválido para a Gupshup.'
        : 'Número de destino inválido para a Gupshup.',
    );
  }
  return normalized;
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
  const mappedApp = String(parseAppBySourceMap()[normalizedSource] || '').trim();
  if (mappedApp) return mappedApp;

  const fallback = env('GUPSHUP_APP_NAME');
  if (fallback) return fallback;

  throw new WhatsAppProviderConfigurationError(
    'gupshup_app_not_mapped',
    'Nenhum app Gupshup foi configurado para o número de origem.',
  );
}

export function resolveGupshupAutomaticTemplateMode(): GupshupAutomaticTemplateMode {
  const configured = env('GUPSHUP_AUTOMATIC_TEMPLATE_MODE').toLowerCase();
  if (!configured) return 'prefer';
  if (configured === 'prefer' || configured === 'required' || configured === 'disabled') {
    return configured;
  }
  throw new WhatsAppProviderConfigurationError(
    'invalid_gupshup_template_mode',
    'GUPSHUP_AUTOMATIC_TEMPLATE_MODE deve ser prefer, required ou disabled.',
  );
}

const templateEnvByKey: Record<GupshupTemplateKey, string> = {
  PAYMENT_CONFIRMED: 'GUPSHUP_TEMPLATE_PAYMENT_CONFIRMED_ID',
  ORDER_PENDING: 'GUPSHUP_TEMPLATE_ORDER_PENDING_ID',
  ORDER_PREPARING: 'GUPSHUP_TEMPLATE_ORDER_PREPARING_ID',
  ORDER_READY: 'GUPSHUP_TEMPLATE_ORDER_READY_ID',
  ORDER_OUT_FOR_DELIVERY: 'GUPSHUP_TEMPLATE_ORDER_OUT_FOR_DELIVERY_ID',
  ORDER_DELIVERED: 'GUPSHUP_TEMPLATE_ORDER_DELIVERED_ID',
  ORDER_CANCELLED: 'GUPSHUP_TEMPLATE_ORDER_CANCELLED_ID',
};

export function resolveGupshupTemplateId(source: string, key: GupshupTemplateKey) {
  const normalizedSource = digitsOnly(source);
  const mapped = String(parseTemplateBySourceMap()[normalizedSource]?.[key] || '').trim();
  if (mapped) return mapped;
  return env(templateEnvByKey[key]) || null;
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
  const normalizedSource = normalizedPhone(source, 'source');
  const normalizedDestination = normalizedPhone(destination, 'destination');
  const form = new URLSearchParams({
    channel: 'whatsapp',
    source: normalizedSource,
    destination: normalizedDestination,
    message: JSON.stringify({ type: 'text', text: String(message || '') }),
    'src.name': resolveGupshupAppName(normalizedSource),
  });

  const response = await send(configuredGupshupEndpoint(), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: requireApiKey(),
    },
    body: form,
  });

  await response.body?.cancel();
  if (!response.ok) throw new Error(`Gupshup recusou a notificação com HTTP ${response.status}.`);
  return { sent: true, provider: 'gupshup', mode: 'session_text' } as const;
}

export async function sendGupshupTemplateMessage({
  source,
  destination,
  templateId,
  params,
  send = fetch,
}: {
  source: string;
  destination: string;
  templateId: string;
  params: string[];
  send?: FetchLike;
}) {
  const normalizedSource = normalizedPhone(source, 'source');
  const normalizedDestination = normalizedPhone(destination, 'destination');
  const normalizedTemplateId = String(templateId || '').trim();
  if (!normalizedTemplateId) {
    throw new WhatsAppProviderConfigurationError(
      'gupshup_template_id_missing',
      'Template da Gupshup não configurado para a notificação automática.',
    );
  }

  const form = new URLSearchParams({
    channel: 'whatsapp',
    source: normalizedSource,
    destination: normalizedDestination,
    'src.name': resolveGupshupAppName(normalizedSource),
    template: JSON.stringify({
      id: normalizedTemplateId,
      params: params.map((value) => String(value ?? '')),
    }),
  });

  const response = await send(configuredGupshupTemplateEndpoint(), {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: requireApiKey(),
    },
    body: form,
  });

  await response.body?.cancel();
  if (!response.ok) throw new Error(`Gupshup recusou o template com HTTP ${response.status}.`);
  return { sent: true, provider: 'gupshup', mode: 'template' } as const;
}
