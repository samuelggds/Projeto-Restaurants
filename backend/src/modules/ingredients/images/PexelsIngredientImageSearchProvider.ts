import {
  IngredientImageSearchUnavailableError,
  type IngredientImageCandidate,
  type IngredientImageSearchProvider,
} from './IngredientImageSearchProvider.js';

type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

function record(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function allowedUrl(value: unknown, hostname: string) {
  try {
    const url = new URL(String(value || ''));
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== hostname ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    ) {
      return '';
    }
    url.hash = '';
    return url.href;
  } catch {
    return '';
  }
}

export class PexelsIngredientImageSearchProvider implements IngredientImageSearchProvider {
  constructor(
    private readonly apiKey = String(process.env.PEXELS_API_KEY || '').trim(),
    private readonly fetcher: FetchLike = globalThis.fetch,
  ) {}

  async search(query: string, page: number, limit: number) {
    if (!this.apiKey) {
      throw new IngredientImageSearchUnavailableError();
    }

    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('locale', 'pt-BR');
    url.searchParams.set('orientation', 'square');
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', String(Math.min(6, Math.max(1, limit))));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response: Awaited<ReturnType<FetchLike>>;

    try {
      response = await this.fetcher(url, {
        headers: { Authorization: this.apiKey, Accept: 'application/json' },
        redirect: 'error',
        signal: controller.signal,
      });
    } catch {
      throw new IngredientImageSearchUnavailableError();
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new IngredientImageSearchUnavailableError();
    }

    let payload: Record<string, unknown>;
    try {
      payload = record(await response.json());
    } catch {
      throw new IngredientImageSearchUnavailableError();
    }

    const photos = Array.isArray(payload.photos) ? payload.photos : [];
    return photos
      .map((value): IngredientImageCandidate | null => {
        const photo = record(value);
        const sources = record(photo.src);
        const providerId = String(photo.id || '').trim();
        const thumbnailUrl = allowedUrl(sources.tiny, 'images.pexels.com');
        const previewUrl = allowedUrl(sources.medium, 'images.pexels.com');
        const downloadUrl = allowedUrl(sources.medium, 'images.pexels.com');
        const sourceUrl = allowedUrl(photo.url, 'www.pexels.com');
        if (!providerId || !thumbnailUrl || !previewUrl || !downloadUrl || !sourceUrl) return null;

        return {
          provider: 'pexels',
          providerId,
          thumbnailUrl,
          previewUrl,
          downloadUrl,
          sourceUrl,
          photographer: String(photo.photographer || 'Pexels').trim() || 'Pexels',
          photographerUrl: allowedUrl(photo.photographer_url, 'www.pexels.com'),
          alt: String(photo.alt || '').trim(),
        };
      })
      .filter((candidate): candidate is IngredientImageCandidate => Boolean(candidate))
      .slice(0, Math.min(6, limit));
  }
}

export default new PexelsIngredientImageSearchProvider();
