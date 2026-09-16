import { createHash } from 'node:crypto';

export const ASAAS_TEMPORARILY_UNAVAILABLE_MESSAGE =
  'Asaas temporariamente indisponível até a plataforma concluir o cadastro empresarial necessário para operar subcontas.';

export function asaasPlatformEnabled() {
  return ['1', 'true', 'yes', 'on'].includes(
    String(process.env.ASAAS_PLATFORM_ENABLED || '')
      .trim()
      .toLowerCase(),
  );
}

export class AsaasProviderError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function asaasRequest<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const base = String(process.env.ASAAS_API_BASE_URL || 'https://api.asaas.com')
    .trim()
    .replace(/\/+$/, '');
  const response = await fetch(`${base}/v3${path}`, {
    redirect: 'error',
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', access_token: token },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      response.status >= 500
        ? 'O Asaas está temporariamente indisponível.'
        : String(
            body?.errors?.[0]?.description || 'Não foi possível concluir a operação no Asaas.',
          );
    throw new AsaasProviderError(response.status, message);
  }
  if (!body || typeof body !== 'object') {
    throw new Error('O Asaas retornou uma resposta incompleta.');
  }
  return body as T;
}

export const ASAAS_PAYMENT_EVENTS = [
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
] as const;

export function asaasWebhookTokenHash() {
  return createHash('sha256')
    .update(String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim())
    .digest('hex');
}

export function asaasWebhookConfiguration(email: string) {
  const authToken = String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  if (authToken.length < 32 || authToken.length > 255) {
    throw new Error('A conexão Asaas precisa de um token de webhook válido no servidor.');
  }
  const backend = String(process.env.BACKEND_URL || '').trim();
  const configuredUrl = String(process.env.ASAAS_WEBHOOK_URL || '').trim();
  let url: URL;
  try {
    url = configuredUrl ? new URL(configuredUrl) : new URL('/api/webhooks/asaas', backend);
  } catch {
    throw new Error('Configure a URL pública do webhook Asaas no servidor.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname)
  ) {
    throw new Error('O webhook Asaas precisa de uma URL pública HTTPS.');
  }
  return {
    name: 'GastroNexa - pagamentos',
    url: url.toString(),
    email,
    enabled: true,
    interrupted: false,
    apiVersion: 3,
    authToken,
    sendType: 'SEQUENTIALLY',
    events: [...ASAAS_PAYMENT_EVENTS],
  };
}

type AsaasWebhook = {
  id?: string;
  url?: string;
  enabled?: boolean;
  interrupted?: boolean;
  events?: string[];
};

export async function findAsaasWebhook(token: string, url: string) {
  const result = await asaasRequest<{ data?: AsaasWebhook[] }>('/webhooks?limit=100', token);
  return (result.data || []).find((hook) => hook.url === url) || null;
}

export async function ensureAsaasWebhook(token: string, email: string) {
  const config = asaasWebhookConfiguration(email);
  const existing = await findAsaasWebhook(token, config.url);
  const result = await asaasRequest<AsaasWebhook>(
    existing?.id ? `/webhooks/${encodeURIComponent(existing.id)}` : '/webhooks',
    token,
    { method: existing?.id ? 'PUT' : 'POST', body: config },
  );
  const id = String(result.id || '').trim();
  if (!id) throw new Error('O Asaas não confirmou a configuração do webhook.');
  return id;
}

export function isAsaasWebhookReady(hook: AsaasWebhook | null) {
  return Boolean(
    hook?.id &&
    hook.enabled === true &&
    hook.interrupted === false &&
    ASAAS_PAYMENT_EVENTS.every((event) => hook.events?.includes(event)),
  );
}
