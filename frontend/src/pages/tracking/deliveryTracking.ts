import {
  isValidCourierRoutePoint,
  mergeCourierRoutePoints,
  type CourierRoutePoint,
} from '../Courier/domain/courierLocation';

export type DeliveryDestination = CourierRoutePoint & { label?: string };

export type DeliveryRouteEstimate = {
  durationSeconds: number;
  distanceMeters: number | null;
  provider: 'OSRM';
  routeCoordinates?: CourierRoutePoint[];
  destination?: DeliveryDestination;
};

export type DeliveryTrackingData = {
  order: {
    id: number;
    restaurantId?: number;
    status: string;
    deliveryStartedAt?: string | null;
    estimatedArrival?: string | null;
    deliveryConfirmationCode?: string | null;
    routeEstimate?: DeliveryRouteEstimate | null;
    assignedCourier?: { name?: string; phone?: string; avatar?: string } | null;
  };
  locations: CourierRoutePoint[];
};

export function isDeliveryTrackingTerminalStatus(status?: string | null) {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'ENTREGUE' || normalized === 'CANCELADO';
}

export function normalizeDeliveryTrackingData(value: unknown): DeliveryTrackingData | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const order =
    record.order && typeof record.order === 'object'
      ? (record.order as Record<string, unknown>)
      : null;
  const id = Number(order?.id);
  if (!order || !Number.isInteger(id) || id <= 0) return null;

  const routeEstimate =
    order.routeEstimate && typeof order.routeEstimate === 'object'
      ? (order.routeEstimate as DeliveryRouteEstimate)
      : null;
  const routeCoordinates = mergeCourierRoutePoints([], routeEstimate?.routeCoordinates || []);
  const destination = isValidCourierRoutePoint(routeEstimate?.destination)
    ? routeEstimate?.destination
    : undefined;

  return {
    order: {
      ...(order as DeliveryTrackingData['order']),
      id,
      restaurantId: order.restaurantId ? Number(order.restaurantId) : undefined,
      status: String(order.status || '').toUpperCase(),
      deliveryConfirmationCode:
        typeof order.deliveryConfirmationCode === 'string'
          ? order.deliveryConfirmationCode
          : null,
      routeEstimate: routeEstimate ? { ...routeEstimate, routeCoordinates, destination } : null,
    },
    locations: mergeCourierRoutePoints([], Array.isArray(record.locations) ? record.locations : []),
  };
}

export function trackingEventMatches(event: unknown, orderId: number, restaurantId?: number) {
  if (!event || typeof event !== 'object') return false;
  const record = event as { orderId?: unknown; id?: unknown; restaurantId?: unknown };
  const eventOrderId = Number(record.orderId ?? record.id);
  if (eventOrderId !== orderId) return false;
  if (record.restaurantId === undefined || restaurantId === undefined) return true;
  return Number(record.restaurantId) === restaurantId;
}

export function mergeTrackingLocation(
  current: DeliveryTrackingData,
  point: unknown,
): DeliveryTrackingData {
  if (isDeliveryTrackingTerminalStatus(current.order.status) || !isValidCourierRoutePoint(point)) {
    return current;
  }
  return {
    ...current,
    locations: mergeCourierRoutePoints(current.locations, [point]),
  };
}
