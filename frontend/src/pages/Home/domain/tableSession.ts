import { toPositiveInteger } from "./productAvailability";

export type StoredTableSession = {
  sessionToken?: string;
  sessionId?: number | string;
  tableId?: number | null;
  tableNumber?: number | null;
  restaurantId?: number | null;
};

export function resolveTableRoute(tableNumber: unknown, restaurantId: unknown, tableId: unknown) {
  const routeTableNumber = toPositiveInteger(tableNumber);
  const routeRestaurantId = toPositiveInteger(restaurantId);
  const routeTableId = toPositiveInteger(tableId) || routeTableNumber;
  return { routeTableNumber, routeRestaurantId, routeTableId, mesaMode: Boolean(routeTableNumber || routeTableId), hasRouteRestaurantId: Boolean(routeRestaurantId) };
}

export function isTableSessionActive(session: StoredTableSession | null, mesaMode: boolean, tableId: number | null, restaurantId: number | null): boolean {
  if (!mesaMode) return true;
  return Boolean(session?.sessionToken && Number(session.tableId) === Number(tableId) && (!restaurantId || Number(session.restaurantId) === Number(restaurantId)));
}

export function belongsToTableRoute(session: StoredTableSession, tableId: number | null, restaurantId: number | null): boolean {
  return Number(session.tableId) === Number(tableId) && (!restaurantId || Number(session.restaurantId) === Number(restaurantId));
}
