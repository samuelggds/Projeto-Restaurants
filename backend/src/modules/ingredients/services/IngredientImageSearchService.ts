import { z } from 'zod';

import pexelsProvider from '../images/PexelsIngredientImageSearchProvider.js';
import {
  IngredientImageSearchUnavailableError,
  type IngredientImageCandidate,
  type IngredientImageSearchProvider,
} from '../images/IngredientImageSearchProvider.js';
import {
  createIngredientImageSelectionToken,
  downloadProviderImage,
  verifyIngredientImageSelectionToken,
} from '../images/ingredientImageSecurity.js';

const RESULT_LIMIT = 6;
const CACHE_TTL_MS = 5 * 60 * 1_000;
const CACHE_MAX_ENTRIES = 500;
const TOKEN_TTL_MS = 15 * 60 * 1_000;

export const ingredientImageSearchSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do ingrediente.').max(80),
  category: z.string().trim().max(60).optional(),
  page: z.number().int().min(1).max(20).optional().default(1),
});

function tenantId(value: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error('Restaurante não encontrado.');
  return parsed;
}

export function buildIngredientImageQuery(name: string, category?: string) {
  return [name.trim(), category?.trim(), 'food ingredient']
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ');
}

type CachedSearch = { expiresAt: number; candidates: IngredientImageCandidate[] };
type ImageDownloader = (url: string) => Promise<string>;

export class IngredientImageSearchService {
  private readonly cache = new Map<string, CachedSearch>();

  constructor(
    private readonly provider: IngredientImageSearchProvider = pexelsProvider,
    private readonly downloader: ImageDownloader = downloadProviderImage,
  ) {}

  private pruneCache(now: number) {
    for (const [key, value] of this.cache) {
      if (value.expiresAt <= now) this.cache.delete(key);
    }
    while (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.cache.delete(oldestKey);
    }
  }

  async search(input: unknown, restaurantId: number) {
    const scopedRestaurantId = tenantId(restaurantId);
    const data = ingredientImageSearchSchema.parse(input);
    const query = buildIngredientImageQuery(data.name, data.category);
    const cacheKey = `${query.toLocaleLowerCase('pt-BR')}::${data.page}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    let candidates: IngredientImageCandidate[];

    if (cached && cached.expiresAt > now) {
      candidates = cached.candidates;
    } else {
      try {
        candidates = (await this.provider.search(query, data.page, RESULT_LIMIT)).slice(
          0,
          RESULT_LIMIT,
        );
      } catch {
        throw new IngredientImageSearchUnavailableError();
      }
      this.pruneCache(now);
      this.cache.set(cacheKey, { candidates, expiresAt: now + CACHE_TTL_MS });
    }

    return {
      query,
      page: data.page,
      provider: 'Pexels',
      results: candidates.map((candidate) => ({
        id: candidate.providerId,
        thumbnailUrl: candidate.thumbnailUrl,
        previewUrl: candidate.previewUrl,
        source: 'Pexels',
        sourceUrl: candidate.sourceUrl,
        photographer: candidate.photographer,
        photographerUrl: candidate.photographerUrl,
        alt: candidate.alt,
        selectionToken: createIngredientImageSelectionToken({
          version: 1,
          restaurantId: scopedRestaurantId,
          provider: candidate.provider,
          providerId: candidate.providerId,
          downloadUrl: candidate.downloadUrl,
          expiresAt: Date.now() + TOKEN_TTL_MS,
        }),
      })),
    };
  }

  async importSelection(selectionToken: string, restaurantId: number) {
    const payload = verifyIngredientImageSelectionToken(selectionToken, tenantId(restaurantId));
    return this.downloader(payload.downloadUrl);
  }
}

export default new IngredientImageSearchService();
