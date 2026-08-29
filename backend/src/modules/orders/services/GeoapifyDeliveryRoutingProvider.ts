import { buildDeliveryDestination, hasValidCoordinates } from '../utils/deliveryRouteEstimate.js';
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
  results?: Array<{
    distance?: number;
  }>;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

class GeoapifyDeliveryRoutingProvider implements DeliveryRoutingProvider {
  readonly id = 'geoapify' as const;

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

  private async geocode(address: DeliveryRoutingRequest['origin']) {
    if (!this.apiKey) return null;

    const text = buildDeliveryDestination(address);
    if (!text) return null;

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

      return hasValidCoordinates(coordinates) ? coordinates : null;
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
      const distanceMeters = Number(payload.results?.[0]?.distance);
      return Number.isFinite(distanceMeters) && distanceMeters >= 0 ? distanceMeters : null;
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
