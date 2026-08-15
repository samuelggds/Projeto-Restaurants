import {
  buildDeliveryDestination,
  hasValidCoordinates,
  parseOsrmRouteEstimate,
  type DeliveryCoordinates,
  type DeliveryRouteEstimate,
} from "../utils/deliveryRouteEstimate.js";

const ROUTE_CACHE_TTL_MS = 20_000;
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type EstimateInput = DeliveryCoordinates & {
  destination: {
    address?: string | null;
    number?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
  };
};

type CachedValue<T> = { expiresAt: number; value: T };
type GeocodingResult = { lat?: string; lon?: string };

function normalizedBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

class GetOsrmDeliveryRouteService {
  private routeCache = new Map<string, CachedValue<DeliveryRouteEstimate | null>>();
  private geocodeCache = new Map<string, CachedValue<DeliveryCoordinates | null>>();

  private get osrmBaseUrl() {
    return normalizedBaseUrl(String(process.env.OSRM_BASE_URL || "").trim());
  }

  private get geocoderBaseUrl() {
    return normalizedBaseUrl(String(process.env.GEOCODER_BASE_URL || "").trim());
  }

  private async geocode(destination: string): Promise<DeliveryCoordinates | null> {
    const cached = this.geocodeCache.get(destination);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    if (!this.geocoderBaseUrl) return null;

    try {
      const url = new URL(`${this.geocoderBaseUrl}/search`);
      url.searchParams.set("q", destination);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "br");

      const response = await fetch(url, {
        headers: { "User-Agent": String(process.env.ROUTING_USER_AGENT || "PizzaIADelivery/1.0") },
      });
      const result = response.ok ? ((await response.json()) as GeocodingResult[])?.[0] : null;
      const coordinates = result
        ? { latitude: Number(result.lat), longitude: Number(result.lon) }
        : null;
      const value = hasValidCoordinates(coordinates) ? coordinates : null;
      this.geocodeCache.set(destination, { value, expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS });
      return value;
    } catch (error) {
      console.warn("[delivery-route] Nao foi possivel localizar o endereco do pedido", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async execute(input: EstimateInput): Promise<DeliveryRouteEstimate | null> {
    const destination = buildDeliveryDestination(input.destination);
    if (!this.osrmBaseUrl || !destination || !hasValidCoordinates(input)) return null;

    const destinationCoordinates = await this.geocode(destination);
    if (!destinationCoordinates) return null;

    const cacheKey = `${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}:${destinationCoordinates.latitude.toFixed(4)}:${destinationCoordinates.longitude.toFixed(4)}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
      const coordinates = `${input.longitude},${input.latitude};${destinationCoordinates.longitude},${destinationCoordinates.latitude}`;
      const response = await fetch(`${this.osrmBaseUrl}/route/v1/driving/${coordinates}?overview=false`);
      const estimate = response.ok ? parseOsrmRouteEstimate(await response.json()) : null;
      this.routeCache.set(cacheKey, { value: estimate, expiresAt: Date.now() + ROUTE_CACHE_TTL_MS });
      return estimate;
    } catch (error) {
      console.warn("[delivery-route] Nao foi possivel calcular a rota do pedido", error instanceof Error ? error.message : String(error));
      return null;
    }
  }
}

export default new GetOsrmDeliveryRouteService();
