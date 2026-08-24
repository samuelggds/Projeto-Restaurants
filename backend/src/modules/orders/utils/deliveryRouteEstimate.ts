export type DeliveryCoordinates = {
  latitude: number;
  longitude: number;
};

export type DeliveryRouteEstimate = {
  durationSeconds: number;
  distanceMeters: number | null;
  provider: 'OSRM';
  routeCoordinates?: DeliveryCoordinates[];
  destination?: DeliveryCoordinates & { label: string };
};

type OsrmRoute = {
  duration?: number;
  distance?: number;
  geometry?: {
    coordinates?: unknown;
  };
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
  return [address.address, address.number, address.district, address.city, address.state, 'Brasil']
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export function parseOsrmRouteEstimate(response: OsrmRoutesResponse): DeliveryRouteEstimate | null {
  const route = response.routes?.[0];
  const durationSeconds = Number(route?.duration);

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return null;

  const rawCoordinates = Array.isArray(route?.geometry?.coordinates)
    ? route.geometry.coordinates
    : [];
  const routeCoordinates = rawCoordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) return null;
      const longitude = Number(coordinate[0]);
      const latitude = Number(coordinate[1]);
      return hasValidCoordinates({ latitude, longitude }) ? { latitude, longitude } : null;
    })
    .filter((coordinate): coordinate is DeliveryCoordinates => Boolean(coordinate));

  return {
    durationSeconds: Math.round(durationSeconds),
    distanceMeters:
      typeof route?.distance === 'number' && route.distance >= 0
        ? Math.round(route.distance)
        : null,
    provider: 'OSRM',
    ...(routeCoordinates.length ? { routeCoordinates } : {}),
  };
}

export function limitRouteCoordinates(coordinates: DeliveryCoordinates[], maximumPoints = 250) {
  if (coordinates.length <= maximumPoints) return coordinates;

  const lastIndex = coordinates.length - 1;
  return Array.from({ length: maximumPoints }, (_, index) => {
    const sourceIndex = Math.round((index * lastIndex) / (maximumPoints - 1));
    return coordinates[sourceIndex];
  });
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
