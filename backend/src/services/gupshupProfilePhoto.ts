type FetchLike = typeof fetch;

export class GupshupProfilePhotoError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GupshupProfilePhotoError';
    this.code = code;
  }
}

function env(name: string) {
  return String(process.env[name] || '').trim();
}

function digitsOnly(value: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function parseAppIdMap() {
  const raw = env('GUPSHUP_APP_ID_BY_SOURCE_JSON');
  if (!raw) return {} as Record<string, string>;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('invalid map');
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .map(([source, appId]) => [digitsOnly(source), String(appId || '').trim()] as const)
        .filter(([source, appId]) => Boolean(source && appId)),
    );
  } catch {
    throw new GupshupProfilePhotoError(
      'invalid_gupshup_app_id_map',
      'GUPSHUP_APP_ID_BY_SOURCE_JSON deve ser um objeto JSON válido.',
    );
  }
}

export function resolveGupshupAppId(source: string) {
  const normalizedSource = digitsOnly(source);
  const mapped = String(parseAppIdMap()[normalizedSource] || '').trim();
  if (mapped) return mapped;

  const fallback = env('GUPSHUP_APP_ID');
  if (fallback) return fallback;

  throw new GupshupProfilePhotoError(
    'gupshup_app_id_not_mapped',
    'Nenhum appId da Gupshup foi configurado para o número do restaurante.',
  );
}

function configuredProfileBaseUrl() {
  const raw = env('GUPSHUP_PROFILE_API_BASE_URL') || 'https://api.gupshup.io';
  const url = new URL(raw);
  const localHttp =
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (url.username || url.password || (url.protocol !== 'https:' && !localHttp)) {
    throw new GupshupProfilePhotoError(
      'invalid_gupshup_profile_url',
      'GUPSHUP_PROFILE_API_BASE_URL deve usar HTTPS.',
    );
  }

  return url;
}

function profilePhotoEndpoint(appId: string) {
  return new URL(
    `/wa/app/${encodeURIComponent(appId)}/business/profile/photo`,
    configuredProfileBaseUrl(),
  );
}

function requireApiKey() {
  const apiKey = env('GUPSHUP_API_KEY');
  if (!apiKey) {
    throw new GupshupProfilePhotoError(
      'gupshup_api_key_missing',
      'GUPSHUP_API_KEY não configurada.',
    );
  }
  return apiKey;
}

function parseImageDataUrl(imageDataUrl: string) {
  const match = /^data:image\/(jpeg|png|webp);base64,([a-z0-9+/=\r\n]+)$/iu.exec(
    String(imageDataUrl || '').trim(),
  );
  if (!match) {
    throw new GupshupProfilePhotoError(
      'invalid_profile_photo',
      'A foto do WhatsApp deve ser uma imagem PNG, JPG ou WEBP válida.',
    );
  }

  const imageType = match[1].toLowerCase();
  const mimeType = imageType === 'png' ? 'image/png' : imageType === 'webp' ? 'image/webp' : 'image/jpeg';
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
    throw new GupshupProfilePhotoError(
      'invalid_profile_photo_size',
      'A foto do WhatsApp deve ter no máximo 5 MB.',
    );
  }

  return { mimeType, bytes };
}

export async function updateGupshupProfilePhoto({
  source,
  imageDataUrl,
  send = fetch,
}: {
  source: string;
  imageDataUrl: string;
  send?: FetchLike;
}) {
  const appId = resolveGupshupAppId(source);
  const { mimeType, bytes } = parseImageDataUrl(imageDataUrl);
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const form = new FormData();
  form.append(
    'image',
    new Blob([new Uint8Array(bytes)], { type: mimeType }),
    `profile.${extension}`,
  );

  const response = await send(profilePhotoEndpoint(appId), {
    method: 'PUT',
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
    headers: { apikey: requireApiKey() },
    body: form,
  });

  await response.body?.cancel();
  if (!response.ok) {
    throw new Error(`Gupshup recusou a foto do perfil com HTTP ${response.status}.`);
  }

  return { updated: true } as const;
}

export async function getGupshupProfilePhoto({
  source,
  send = fetch,
}: {
  source: string;
  send?: FetchLike;
}) {
  const appId = resolveGupshupAppId(source);
  const response = await send(profilePhotoEndpoint(appId), {
    method: 'GET',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: { apikey: requireApiKey() },
  });

  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Gupshup recusou a consulta da foto com HTTP ${response.status}.`);
  }

  const body = (await response.json()) as { message?: unknown };
  const imageUrl = String(body?.message || '').trim();
  if (!imageUrl) return { imageUrl: null } as const;

  const parsed = new URL(imageUrl);
  if (parsed.protocol !== 'https:') {
    throw new GupshupProfilePhotoError(
      'invalid_profile_photo_response',
      'A Gupshup retornou uma URL de foto inválida.',
    );
  }

  return { imageUrl } as const;
}
