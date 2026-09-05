export const MAX_COURIER_TRACKING_ACCURACY_METERS = 500;

export type CourierRoutePoint = {
  latitude: number;
  longitude: number;
  recordedAt?: string;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
};

export type CourierLocationFailure = {
  status: 'blocked' | 'timeout' | 'error';
  message: string;
  hint: string;
};

export function isValidCourierRoutePoint(value: unknown): value is CourierRoutePoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<CourierRoutePoint>;
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Number(point.latitude) >= -90 &&
    Number(point.latitude) <= 90 &&
    Number(point.longitude) >= -180 &&
    Number(point.longitude) <= 180
  );
}

export function isShareableCourierRoutePoint(point: CourierRoutePoint) {
  return (
    isValidCourierRoutePoint(point) &&
    Number.isFinite(point.accuracy) &&
    Number(point.accuracy) >= 0 &&
    Number(point.accuracy) <= MAX_COURIER_TRACKING_ACCURACY_METERS
  );
}

export function routePointFromPosition(
  position: GeolocationPosition,
  recordedAt = Number.isFinite(position.timestamp)
    ? new Date(position.timestamp).toISOString()
    : new Date().toISOString(),
): CourierRoutePoint | null {
  const point: CourierRoutePoint = {
    latitude: Number(position.coords.latitude),
    longitude: Number(position.coords.longitude),
    heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
    speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
    accuracy:
      Number.isFinite(position.coords.accuracy) && position.coords.accuracy >= 0
        ? position.coords.accuracy
        : null,
    recordedAt,
  };
  return isValidCourierRoutePoint(point) ? point : null;
}

export function buildCourierLocationPayload(orderId: number, point: CourierRoutePoint) {
  if (!Number.isInteger(orderId) || orderId <= 0 || !isValidCourierRoutePoint(point)) return null;
  return {
    orderId,
    latitude: point.latitude,
    longitude: point.longitude,
    heading: Number.isFinite(point.heading) ? point.heading : null,
    speed: Number.isFinite(point.speed) ? point.speed : null,
    accuracy:
      Number.isFinite(point.accuracy) && Number(point.accuracy) >= 0
        ? Math.round(Number(point.accuracy))
        : null,
    sentAt: point.recordedAt || new Date().toISOString(),
  };
}

export function mergeCourierRoutePoints(
  current: CourierRoutePoint[],
  incoming: unknown[],
  limit = 1000,
) {
  const seen = new Set<string>();
  return [...current, ...incoming]
    .filter(isValidCourierRoutePoint)
    .filter((point) => {
      const key = `${point.latitude}:${point.longitude}:${point.recordedAt || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-limit);
}

export function describeGeolocationFailure(error: Pick<GeolocationPositionError, 'code'>) {
  if (error.code === 1) {
    return {
      status: 'blocked',
      message: 'A localização foi bloqueada para este site.',
      hint: 'Abra as permissões do navegador, permita Localização e toque em Tentar novamente.',
    } satisfies CourierLocationFailure;
  }
  if (error.code === 3) {
    return {
      status: 'timeout',
      message: 'O GPS demorou para responder.',
      hint: 'Vá para um local aberto, confira se o GPS está ligado e tente novamente.',
    } satisfies CourierLocationFailure;
  }
  return {
    status: 'error',
    message: 'Não foi possível obter sua posição agora.',
    hint: 'Confira o GPS e a conexão do celular antes de tentar novamente.',
  } satisfies CourierLocationFailure;
}

export function courierTrackingPreferenceKey(accountId: number | string) {
  return `courier-location-tracking:${String(accountId || 'unknown')}`;
}
