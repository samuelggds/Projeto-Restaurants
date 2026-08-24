import { toPositiveInteger } from './productAvailability';

export type StoredTableSession = {
  sessionToken?: string;
  sessionId?: number | string;
  tableId?: number | null;
  tableNumber?: number | null;
  restaurantId?: number | null;
  expiresAt?: string | null;
  tableOrderingEnabled?: boolean;
  waiterCallEnabled?: boolean;
  billRequestEnabled?: boolean;
};

export function resolveTableRoute(tableNumber: unknown, restaurantId: unknown, tableId: unknown) {
  const routeTableNumber = toPositiveInteger(tableNumber);
  const routeRestaurantId = toPositiveInteger(restaurantId);
  const routeTableId = toPositiveInteger(tableId);
  return {
    routeTableNumber,
    routeRestaurantId,
    routeTableId,
    mesaMode: Boolean(routeTableNumber),
    hasRouteRestaurantId: Boolean(routeRestaurantId),
  };
}

export function isTableSessionActive(
  session: StoredTableSession | null,
  mesaMode: boolean,
  tableId: number | null,
  restaurantId: number | null,
): boolean {
  if (!mesaMode) return true;
  const expiresAt = session?.expiresAt ? new Date(session.expiresAt).getTime() : null;
  return Boolean(
    session?.sessionToken &&
    (!expiresAt || expiresAt > Date.now()) &&
    Number(session.tableId) === Number(tableId) &&
    (!restaurantId || Number(session.restaurantId) === Number(restaurantId)),
  );
}

export function belongsToTableRoute(
  session: StoredTableSession,
  tableId: number | null,
  restaurantId: number | null,
): boolean {
  return (
    Number(session.tableId) === Number(tableId) &&
    (!restaurantId || Number(session.restaurantId) === Number(restaurantId))
  );
}
