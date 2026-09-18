import {
  buildDeliveryDestination,
  hasValidCoordinates,
  limitRouteCoordinates,
  type DeliveryCoordinates,
  type DeliveryRouteEstimate,
} from '../utils/deliveryRouteEstimate.js';
import type {
  DeliveryRoutingProvider,
  DeliveryRoutingRequest,
} from './DeliveryRoutingProvider.js';

type GeoapifyGeocodeResponse = {
  results?: Array<{
    lat?: number;
    lon?: number;
  }>;
};

type GeoapifyRoutingResponse = {
  features?: Array<{
    properties?: {
      distance?: number;
      time?: number;
    };
    geometry?: {
      coordinates?: unknown;
    };
  }>;
  results?: Array<{
    distance?: number;
    time?: number;
    geometry?: {
      coordinates?: unknown;
    };
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

function parseRouteCoordinates(value: unknown): DeliveryCoordinates[] {
  const coordinates: DeliveryCoordinates[] = [];

  const visit = (node: unknown) => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === 'number' &&
      typeof node[1] === 'number'
    ) {
      const point = {
        longitude: Number(node[0]),
        latitude: Number(node[1]),
      };
      if (hasValidCoordinates(point)) coordinates.push(point);
      return;
    }
    node.forEach(visit);
  };

  visit(value);
  return coordinates;
}

class GeoapifyDeliveryRoutingProvider implements DeliveryRoutingProvider {
  readonly id = 'geoapify' as const;

  private geocodeCache = new Map<string, CachedValue<DeliveryCoordinates | null>>();
  private routeCache = new Map<string, CachedValue<DeliveryRouteEstimate | null>>();

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

  async geocodeAddress(address: DeliveryRoutingRequest['origin']) {
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

  private async calculateRoute(
    origin: DeliveryCoordinates,
    destination: DeliveryCoordinates,
    destinationLabel: string,
    mode: 'drive' | 'motorcycle',
    requireDuration = true,
  ): Promise<DeliveryRouteEstimate | null> {
    if (!this.apiKey || !hasValidCoordinates(origin) || !hasValidCoordinates(destination)) {
      return null;
    }

    const routeCacheKey = [
      mode,
      origin.latitude.toFixed(5),
      origin.longitude.toFixed(5),
      destination.latitude.toFixed(5),
      destination.longitude.toFixed(5),
    ].join(':');
    const cachedRoute = getFreshCachedValue(this.routeCache, routeCacheKey);
    if (cachedRoute !== undefined) {
      return cachedRoute
        ? {
            ...cachedRoute,
            destination: { ...destination, label: destinationLabel },
          }
        : null;
    }

    try {
      const url = new URL(`${this.baseUrl}/v1/routing`);
      url.searchParams.set(
        'waypoints',
        `${origin.latitude},${origin.longitude}|${destination.latitude},${destination.longitude}`,
      );
      url.searchParams.set('mode', mode);
      url.searchParams.set('format', 'geojson');
      url.searchParams.set('apiKey', this.apiKey);

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as GeoapifyRoutingResponse;
      const feature = payload.features?.[0];
      const result = payload.results?.[0];
      const rawDurationSeconds = Number(feature?.properties?.time ?? result?.time);
      const rawDistanceMeters = Number(feature?.properties?.distance ?? result?.distance);
      const routeCoordinates = limitRouteCoordinates(
        parseRouteCoordinates(feature?.geometry?.coordinates ?? result?.geometry?.coordinates),
      );
      const hasDuration = Number.isFinite(rawDurationSeconds) && rawDurationSeconds > 0;
      const hasDistance = Number.isFinite(rawDistanceMeters) && rawDistanceMeters >= 0;

      const estimate =
        (requireDuration ? hasDuration : hasDistance)
          ? {
              durationSeconds: hasDuration ? Math.round(rawDurationSeconds) : 0,
              distanceMeters: hasDistance ? Math.round(rawDistanceMeters) : null,
              provider: 'GEOAPIFY' as const,
              routeCoordinates:
                routeCoordinates.length >= 2 ? routeCoordinates : [origin, destination],
              destination: {
                ...destination,
                label: destinationLabel,
              },
            }
          : null;

      setBoundedCacheValue(
        this.routeCache,
        routeCacheKey,
        estimate,
        ROUTE_CACHE_TTL_MS,
        this.maximumCacheEntries,
      );
      return estimate;
    } catch (error) {
      console.warn(
        '[delivery-route] Geoapify nao conseguiu calcular a rota',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  async calculateRouteEstimate(input: DeliveryCoordinates & {
    destination: DeliveryRoutingRequest['destination'];
  }) {
    const destinationLabel = buildDeliveryDestination(input.destination);
    if (!destinationLabel || !hasValidCoordinates(input)) return null;

    const destinationCoordinates = await this.geocodeAddress(input.destination);
    if (!destinationCoordinates) return null;

    return this.calculateRoute(
      { latitude: input.latitude, longitude: input.longitude },
      destinationCoordinates,
      destinationLabel,
      'motorcycle',
    );
  }

  async calculateDistanceMeters({ origin, destination }: DeliveryRoutingRequest) {
    if (!this.apiKey) return null;

    const [originCoordinates, destinationCoordinates] = await Promise.all([
      this.geocodeAddress(origin),
      this.geocodeAddress(destination),
    ]);

    if (!originCoordinates || !destinationCoordinates) return null;

    const estimate = await this.calculateRoute(
      originCoordinates,
      destinationCoordinates,
      buildDeliveryDestination(destination),
      'drive',
      false,
    );
    return estimate?.distanceMeters ?? null;
  }
}

export default new GeoapifyDeliveryRoutingProvider();
