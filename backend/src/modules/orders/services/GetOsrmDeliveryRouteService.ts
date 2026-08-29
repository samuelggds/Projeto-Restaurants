import {
  buildDeliveryDestination,
  hasValidCoordinates,
  limitRouteCoordinates,
  parseOsrmRouteEstimate,
  type DeliveryCoordinates,
  type DeliveryRouteEstimate,
} from '../utils/deliveryRouteEstimate.js';

const ROUTE_CACHE_TTL_MS = 20_000;
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export type DeliveryRouteAddress = {
  address?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
};

type EstimateInput = DeliveryCoordinates & {
  destination: DeliveryRouteAddress;
};

type CachedValue<T> = { expiresAt: number; value: T };
type GeocodingResult = { lat?: string; lon?: string };
type CachedRouteEstimate = Omit<DeliveryRouteEstimate, 'destination'>;

function normalizedBaseUrl(value: string) {
  return value.replace(/\/$/, '');
}

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

  // Reinserir mantem os itens usados recentemente no fim do Map (LRU simples).
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

function attachCurrentDestination(
  route: CachedRouteEstimate | null,
  coordinates: DeliveryCoordinates,
  label: string,
): DeliveryRouteEstimate | null {
  if (!route) return null;
  return {
    ...route,
    destination: {
      ...coordinates,
      label,
    },
  };
}

class GetOsrmDeliveryRouteService {
  // O endereço textual pertence ao pedido atual e nunca pode entrar neste cache global.
  private routeCache = new Map<string, CachedValue<CachedRouteEstimate | null>>();
  private geocodeCache = new Map<string, CachedValue<DeliveryCoordinates | null>>();

  private get osrmBaseUrl() {
    return normalizedBaseUrl(String(process.env.OSRM_BASE_URL || '').trim());
  }

  private get geocoderBaseUrl() {
    return normalizedBaseUrl(String(process.env.GEOCODER_BASE_URL || '').trim());
  }

  private get maximumCacheEntries() {
    return positiveInteger(process.env.ROUTING_CACHE_MAX_ENTRIES, 5000);
  }

  private get routeTimeoutMs() {
    return positiveInteger(process.env.ROUTING_REQUEST_TIMEOUT_MS, 4000);
  }

  private get geocoderTimeoutMs() {
    return positiveInteger(process.env.GEOCODER_REQUEST_TIMEOUT_MS, 4000);
  }

  private async geocode(destination: string): Promise<DeliveryCoordinates | null> {
    const cached = getFreshCachedValue(this.geocodeCache, destination);
    if (cached !== undefined) return cached;
    if (!this.geocoderBaseUrl) return null;

    try {
      const url = new URL(`${this.geocoderBaseUrl}/search`);
      url.searchParams.set('q', destination);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '1');
      url.searchParams.set('countrycodes', 'br');

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': String(process.env.ROUTING_USER_AGENT || 'PizzaIADelivery/1.0'),
        },
        signal: AbortSignal.timeout(this.geocoderTimeoutMs),
      });
      const result = response.ok ? ((await response.json()) as GeocodingResult[])?.[0] : null;
      const coordinates = result
        ? { latitude: Number(result.lat), longitude: Number(result.lon) }
        : null;
      const value = hasValidCoordinates(coordinates) ? coordinates : null;
      setBoundedCacheValue(
        this.geocodeCache,
        destination,
        value,
        GEOCODE_CACHE_TTL_MS,
        this.maximumCacheEntries,
      );
      return value;
    } catch (error) {
      console.warn(
        '[delivery-route] Nao foi possivel localizar o endereco do pedido',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  async geocodeAddress(address: DeliveryRouteAddress): Promise<DeliveryCoordinates | null> {
    const destination = buildDeliveryDestination(address);
    if (!destination) return null;
    return this.geocode(destination);
  }

  async execute(input: EstimateInput): Promise<DeliveryRouteEstimate | null> {
    const destination = buildDeliveryDestination(input.destination);
    if (!this.osrmBaseUrl || !destination || !hasValidCoordinates(input)) return null;

    const destinationCoordinates = await this.geocodeAddress(input.destination);
    if (!destinationCoordinates) return null;

    const cacheKey = `${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${destinationCoordinates.latitude.toFixed(4)}:${destinationCoordinates.longitude.toFixed(4)}`;
    const cached = getFreshCachedValue(this.routeCache, cacheKey);
    if (cached !== undefined) {
      return attachCurrentDestination(cached, destinationCoordinates, destination);
    }

    try {
      const coordinates = `${input.longitude},${input.latitude};${destinationCoordinates.longitude},${destinationCoordinates.latitude}`;
      const response = await fetch(
        `${this.osrmBaseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(this.routeTimeoutMs),
        },
      );
      const route = response.ok ? parseOsrmRouteEstimate(await response.json()) : null;
      const estimate: CachedRouteEstimate | null = route
        ? {
            ...route,
            routeCoordinates: limitRouteCoordinates(
              route.routeCoordinates?.length
                ? route.routeCoordinates
                : [
                    { latitude: input.latitude, longitude: input.longitude },
                    destinationCoordinates,
                  ],
            ),
          }
        : null;
      setBoundedCacheValue(
        this.routeCache,
        cacheKey,
        estimate,
        ROUTE_CACHE_TTL_MS,
        this.maximumCacheEntries,
      );
      return attachCurrentDestination(estimate, destinationCoordinates, destination);
    } catch (error) {
      console.warn(
        '[delivery-route] Nao foi possivel calcular a rota do pedido',
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }
}

export default new GetOsrmDeliveryRouteService();
