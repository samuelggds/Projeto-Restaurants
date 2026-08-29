import { buildDeliveryDestination, hasValidCoordinates } from '../utils/deliveryRouteEstimate.js';
import type {
  DeliveryRoutingProvider,
  DeliveryRoutingRequest,
} from './DeliveryRoutingProvider.js';

type DeliveryCoordinates = {
  latitude: number;
  longitude: number;
};

type GeoapifyGeocodeResponse = {
  results?: Array<{
    lat?: number;
    lon?: number;
  }>;
};

type GeoapifyRoutingResponse = {
  results?: Array<{
    distance?: number;
  }>;
};

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ROUTE_CACHE_TTL_MS = 20_000;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getFreshCachedValue<T>(cache: Map<string, CachedValue<T>>, key: string) {
  const cached = cache.get(key);
  if (!cached) return undefined;

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }

  cache.delete(key);
  cache.set(key, cached);
  return cached.value;
}

function setBoundedCacheValue<T>(
  cache: Map<string, CachedValue<T>>,
  key: string,
  value: T,
  ttlMs: number,
  maximumEntries: number,
) {
  const now = Date.now();

  for (const [cachedKey, cached] of cache) {
    if (cached.expiresAt <= now) cache.delete(cachedKey);
  }

  cache.delete(key);
  while (cache.size >= maximumEntries) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }

  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
}

class GeoapifyDeliveryRoutingProvider implements DeliveryRoutingProvider {
  readonly id = 'geoapify' as const;

  private geocodeCache = new Map<string, CachedValue<DeliveryCoordinates | null>>();
  private routeCache = new Map<string, CachedValue<number | null>>();

  private get apiKey() {
    return String(process.env.GEOAPIFY_API_KEY || '').trim();
  }

  private get baseUrl() {
    return String(process.env.GEOAPIFY_BASE_URL || 'https://api.geoapify.com')
      .trim()
      .replace(/\/$/, '');
  }

  private get timeoutMs() {
    return positiveInteger(process.env.ROUTING_REQUEST_TIMEOUT_MS, 4000);
  }

  private get maximumCacheEntries() {
    return positiveInteger(process.env.ROUTING_CACHE_MAX_ENTRIES, 5000);
  }

  private async geocode(address: DeliveryRoutingRequest['origin']) {
    if (!this.apiKey) return null;

    const text = buildDeliveryDestination(address);
    if (!text) return null;

    const cacheKey = text.toLowerCase();
    const cached = getFreshCachedValue(this.geocodeCache, cacheKey);
    if (cached !== undefined) return cached;

    try {
      const url = new URL(`${this.baseUrl}/v1/geocode/search`);
      url.searchParams.set('text', text);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('filter', 'countrycode:br');
      url.searchParams.set('apiKey', this.apiKey);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as GeoapifyGeocodeResponse;
      const result = payload.results?.[0];
      const coordinates = result
        ? { latitude: Number(result.lat), longitude: Number(result.lon) }
        : null;
      const value = hasValidCoordinates(coordinates) ? coordinates : null;

      setBoundedCacheValue(
        this.geocodeCache,
        cacheKey,
        value,
        GEOCODE_CACHE_TTL_MS,
        this.maximumCacheEntries,
      );
      return value;
    } catch (error) {
      console.warn(
        '[delivery-route] Geoapify nao conseguiu localizar o endereco',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  async calculateDistanceMeters({ origin, destination }: DeliveryRoutingRequest) {
    if (!this.apiKey) return null;

    const [originCoordinates, destinationCoordinates] = await Promise.all([
      this.geocode(origin),
      this.geocode(destination),
    ]);

    if (!originCoordinates || !destinationCoordinates) return null;

    const routeCacheKey = [
      originCoordinates.latitude.toFixed(5),
      originCoordinates.longitude.toFixed(5),
      destinationCoordinates.latitude.toFixed(5),
      destinationCoordinates.longitude.toFixed(5),
    ].join(':');
    const cachedRoute = getFreshCachedValue(this.routeCache, routeCacheKey);
    if (cachedRoute !== undefined) return cachedRoute;

    try {
      const url = new URL(`${this.baseUrl}/v1/routing`);
      url.searchParams.set(
        'waypoints',
        `${originCoordinates.latitude},${originCoordinates.longitude}|${destinationCoordinates.latitude},${destinationCoordinates.longitude}`,
      );
      url.searchParams.set('mode', 'drive');
      url.searchParams.set('format', 'json');
      url.searchParams.set('apiKey', this.apiKey);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as GeoapifyRoutingResponse;
      const rawDistanceMeters = Number(payload.results?.[0]?.distance);
      const distanceMeters =
        Number.isFinite(rawDistanceMeters) && rawDistanceMeters >= 0 ? rawDistanceMeters : null;

      setBoundedCacheValue(
        this.routeCache,
        routeCacheKey,
        distanceMeters,
        ROUTE_CACHE_TTL_MS,
        this.maximumCacheEntries,
      );
      return distanceMeters;
    } catch (error) {
      console.warn(
        '[delivery-route] Geoapify nao conseguiu calcular a rota',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }
}

export default new GeoapifyDeliveryRoutingProvider();
