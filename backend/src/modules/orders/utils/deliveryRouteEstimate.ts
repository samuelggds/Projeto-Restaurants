export type DeliveryCoordinates = {
  latitude: number;
  longitude: number;
};

export type DeliveryRouteEstimate = {
  durationSeconds: number;
  distanceMeters: number | null;
  provider: "OSRM";
};

type OsrmRoute = {
  duration?: number;
  distance?: number;
};

type OsrmRoutesResponse = {
  code?: string;
  routes?: OsrmRoute[];
};

export function buildDeliveryDestination(address: {
  address?: string | null;
  number?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
}) {
  return [
    address.address,
    address.number,
    address.district,
    address.city,
    address.state,
    "Brasil",
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function parseOsrmRouteEstimate(
  response: OsrmRoutesResponse,
): DeliveryRouteEstimate | null {
  const route = response.routes?.[0];
  const durationSeconds = Number(route?.duration);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  return {
    durationSeconds: Math.round(durationSeconds),
    distanceMeters: typeof route?.distance === "number" && route.distance >= 0 ? Math.round(route.distance) : null,
    provider: "OSRM",
  };
}

export function hasValidCoordinates(
  value: Partial<DeliveryCoordinates> | null | undefined,
): value is DeliveryCoordinates {
  return (
    Number.isFinite(value?.latitude) &&
    Number.isFinite(value?.longitude) &&
    Number(value?.latitude) >= -90 &&
    Number(value?.latitude) <= 90 &&
    Number(value?.longitude) >= -180 &&
    Number(value?.longitude) <= 180
  );
}
