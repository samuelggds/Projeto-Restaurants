type GoogleGeocodingResult = {
  formatted_address?: string;
  partial_match?: boolean;
  geometry?: {
    location?: { lat?: number; lng?: number };
    location_type?: string;
  };
};

type GoogleGeocodingResponse = {
  status?: string;
  error_message?: string;
  results?: GoogleGeocodingResult[];
};

export type AddressLocation = {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  locationType: string;
  partialMatch: boolean;
};

type AddressInput = {
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
};

type CachedLocation = {
  expiresAt: number;
  value: AddressLocation;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 1000;
const cache = new Map<string, CachedLocation>();

function apiKey() {
  return String(
    process.env.GOOGLE_GEOCODING_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_ROUTES_API_KEY ||
      '',
  ).trim();
}

function baseUrl() {
  return String(
    process.env.GOOGLE_GEOCODING_BASE_URL ||
      'https://maps.googleapis.com/maps/api/geocode/json',
  ).trim();
}

function timeoutMs() {
  const parsed = Number(process.env.GEOCODING_REQUEST_TIMEOUT_MS || 4000);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 4000;
}

function buildAddress(input: AddressInput) {
  return [
    [input.address, input.number].filter(Boolean).join(', '),
    input.district,
    input.city,
    input.state,
    input.zipCode,
    'Brasil',
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function getCached(key: string) {
  const current = cache.get(key);
  if (!current) return null;
  if (current.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, current);
  return current.value;
}

function setCached(key: string, value: AddressLocation) {
  const now = Date.now();
  for (const [cachedKey, item] of cache) {
    if (item.expiresAt <= now) cache.delete(cachedKey);
  }
  cache.delete(key);
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
}

class GoogleAddressGeocodingService {
  async execute(input: AddressInput): Promise<AddressLocation | null> {
    const key = apiKey();
    if (!key) return null;

    const address = buildAddress(input);
    if (!address) return null;

    const cacheKey = address.toLocaleLowerCase('pt-BR');
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const url = new URL(baseUrl());
      url.searchParams.set('address', address);
      url.searchParams.set('key', key);
      url.searchParams.set('language', 'pt-BR');
      url.searchParams.set('region', 'br');

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs()),
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as GoogleGeocodingResponse;
      if (payload.status !== 'OK') return null;

      const result = payload.results?.[0];
      const latitude = Number(result?.geometry?.location?.lat);
      const longitude = Number(result?.geometry?.location?.lng);
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return null;
      }

      const location: AddressLocation = {
        latitude,
        longitude,
        formattedAddress: String(result?.formatted_address || address),
        locationType: String(result?.geometry?.location_type || 'GEOCODED'),
        partialMatch: result?.partial_match === true,
      };
      setCached(cacheKey, location);
      return location;
    } catch {
      return null;
    }
  }
}

export default new GoogleAddressGeocodingService();
