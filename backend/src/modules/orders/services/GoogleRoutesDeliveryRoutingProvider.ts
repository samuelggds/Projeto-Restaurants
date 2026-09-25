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

type GoogleRoute = {
  duration?: string;
  distanceMeters?: number;
  polyline?: {
    geoJsonLinestring?: {
      coordinates?: unknown;
    };
  };
};

type GoogleRoutesResponse = {
  routes?: GoogleRoute[];
};

type CachedValue<T> = {
  expiresAt: number;
  value: T;
};

const ROUTE_CACHE_TTL_MS = 20_000;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDurationSeconds(value: string | undefined) {
  const match = String(value || '').match(/^([0-9]+(?:\.[0-9]+)?)s$/u);
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
}

function parseGeoJsonCoordinates(value: unknown): DeliveryCoordinates[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
      const longitude = Number(coordinate[0]);
      const latitude = Number(coordinate[1]);
      return hasValidCoordinates({ latitude, longitude }) ? { latitude, longitude } : null;
    })
    .filter((coordinate): coordinate is DeliveryCoordinates => Boolean(coordinate));
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
  cache.set(key, { value, expiresAt: now + ttlMs });
}

class GoogleRoutesDeliveryRoutingProvider implements DeliveryRoutingProvider {
  readonly id = 'google' as const;

  private routeCache = new Map<string, CachedValue<DeliveryRouteEstimate | null>>();

  private get apiKey() {
    return String(process.env.GOOGLE_ROUTES_API_KEY || '').trim();
  }

  private get baseUrl() {
    return String(process.env.GOOGLE_ROUTES_BASE_URL || 'https://routes.googleapis.com')
      .trim()
      .replace(/\/$/u, '');
  }

  private get timeoutMs() {
    return positiveInteger(process.env.ROUTING_REQUEST_TIMEOUT_MS, 4000);
  }

  private get maximumCacheEntries() {
    return positiveInteger(process.env.ROUTING_CACHE_MAX_ENTRIES, 5000);
  }

  private async computeRoute({
    origin,
    destination,
    travelMode,
    includePolyline,
  }: {
    origin:
      | { location: { latLng: { latitude: number; longitude: number } } }
      | { address: string };
    destination: { address: string };
    travelMode: 'DRIVE' | 'TWO_WHEELER';
    includePolyline: boolean;
  }) {
    if (!this.apiKey) return null;

    const fieldMask = includePolyline
      ? 'routes.duration,routes.distanceMeters,routes.polyline.geoJsonLinestring'
      : 'routes.distanceMeters';

    const response = await fetch(`${this.baseUrl}/directions/v2:computeRoutes`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify({
        origin,
        destination,
        travelMode,
        routingPreference: 'TRAFFIC_AWARE',
        polylineQuality: includePolyline ? 'HIGH_QUALITY' : 'OVERVIEW',
        polylineEncoding: 'GEO_JSON_LINESTRING',
        languageCode: 'pt-BR',
        regionCode: 'BR',
        units: 'METRIC',
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      console.warn('[delivery-route] Google Routes rejeitou a rota', response.status);
      return null;
    }

    return (await response.json()) as GoogleRoutesResponse;
  }

  async calculateRouteEstimate(input: DeliveryCoordinates & {
    destination: DeliveryRoutingRequest['destination'];
  }): Promise<DeliveryRouteEstimate | null> {
    if (!this.apiKey || !hasValidCoordinates(input)) return null;

    const destinationLabel = buildDeliveryDestination(input.destination);
    if (!destinationLabel) return null;

    const cacheKey = [
      input.latitude.toFixed(5),
      input.longitude.toFixed(5),
      destinationLabel.toLowerCase(),
    ].join(':');
    const cached = getFreshCachedValue(this.routeCache, cacheKey);
    if (cached !== undefined) return cached;

    try {
      const payload = await this.computeRoute({
        origin: {
          location: {
            latLng: {
              latitude: input.latitude,
              longitude: input.longitude,
            },
          },
        },
        destination: { address: destinationLabel },
        travelMode: 'TWO_WHEELER',
        includePolyline: true,
      });

      const route = payload?.routes?.[0];
      const durationSeconds = parseDurationSeconds(route?.duration);
      const distanceMeters = Number(route?.distanceMeters);
      const coordinates = limitRouteCoordinates(
        parseGeoJsonCoordinates(route?.polyline?.geoJsonLinestring?.coordinates),
      );

      const estimate =
        durationSeconds && Number.isFinite(distanceMeters) && distanceMeters >= 0 && coordinates.length >= 2
          ? {
              durationSeconds,
              distanceMeters: Math.round(distanceMeters),
              provider: 'GOOGLE_ROUTES' as const,
              routeCoordinates: coordinates,
              destination: {
                ...coordinates[coordinates.length - 1],
                label: destinationLabel,
              },
            }
          : null;

      setBoundedCacheValue(
        this.routeCache,
        cacheKey,
        estimate,
        ROUTE_CACHE_TTL_MS,
        this.maximumCacheEntries,
      );
      return estimate;
    } catch (error) {
      console.warn(
        '[delivery-route] Google Routes nao conseguiu calcular a rota',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  async calculateDistanceMeters({ origin, destination }: DeliveryRoutingRequest) {
    if (!this.apiKey) return null;

    const originLabel = buildDeliveryDestination(origin);
    const destinationLabel = buildDeliveryDestination(destination);
    if (!originLabel || !destinationLabel) return null;

    try {
      const payload = await this.computeRoute({
        origin: { address: originLabel },
        destination: { address: destinationLabel },
        travelMode: 'DRIVE',
        includePolyline: false,
      });
      const distanceMeters = Number(payload?.routes?.[0]?.distanceMeters);
      return Number.isFinite(distanceMeters) && distanceMeters >= 0
        ? Math.round(distanceMeters)
        : null;
    } catch (error) {
      console.warn(
        '[delivery-route] Google Routes nao conseguiu calcular a distancia',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }
}

export default new GoogleRoutesDeliveryRoutingProvider();
