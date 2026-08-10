export type CourierOrder = { id?: number; type?: string; status?: string; createdAt?: string };

export function getNormalizedOrderStatus(order: CourierOrder): string {
  return String(order.status || "").toUpperCase();
}

export function isCourierDeliveryOrder(order: CourierOrder): boolean {
  return String(order.type || "").toUpperCase() === "DELIVERY";
}

export function isReadyForCourierPickup(order: CourierOrder): boolean {
  return isCourierDeliveryOrder(order) && getNormalizedOrderStatus(order) === "PRONTO";
}

function createdAtMs(order: CourierOrder): number {
  const parsed = Date.parse(String(order.createdAt || ""));
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function compareReadyForPickupOrders(a: CourierOrder, b: CourierOrder): number {
  const byDate = createdAtMs(a) - createdAtMs(b);
  return byDate !== 0 ? byDate : Number(a.id || 0) - Number(b.id || 0);
}

export function filterCourierOrders(orders: CourierOrder[], status: string, search: string): CourierOrder[] {
  const idSearch = search.replace(/\D/g, "");
  return orders.filter((order) => getNormalizedOrderStatus(order) === status.toUpperCase() && (!idSearch || String(order.id || "").includes(idSearch)));
}
