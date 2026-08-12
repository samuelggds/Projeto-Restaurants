import type {
  Order,
  OrderChannel,
  OrderStatus,
  RestaurantBrand,
} from "../kitchen/types";

export function formatElapsed(createdAt: string, now = Date.now()): string {
  const diff = Math.max(
    0,
    Math.floor((now - new Date(createdAt).getTime()) / 1000),
  );
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  const clock = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${clock}` : clock;
}

export function mapOperationalOrders(
  raw: unknown[],
  now = Date.now(),
): Order[] {
  return (raw as Record<string, unknown>[]).map((record) => {
    const type = String(record.type || record.orderType || "").toUpperCase();
    const channel: OrderChannel =
      type === "MESA" || type === "TABLE_SESSION"
        ? "TABLE"
        : type === "DELIVERY"
          ? "DELIVERY"
          : "PICKUP";
    const tableSession = record.tableSession as Record<string, unknown> | null;
    const table = tableSession?.table as Record<string, unknown> | undefined;
    const tableNumber = table?.number ?? record.tableNumber;
    const reference =
      channel === "TABLE"
        ? `Mesa ${tableNumber ?? "?"}`
        : channel === "DELIVERY"
          ? "Delivery"
          : "Retirada";
    const items = ((record.items as Record<string, unknown>[]) || []).map(
      (item) => {
        const product = item.product as Record<string, unknown> | undefined;
        return `${item.quantity}× ${product?.name || item.productName || ""}`;
      },
    );
    const createdAt = String(record.createdAt || "");
    return {
      id: `#${record.id}`,
      channel,
      reference,
      customer:
        String(
          (record.user as Record<string, unknown>)?.name ||
            record.customerName ||
            "",
        ) || undefined,
      items,
      createdAt: createdAt
        ? new Date(createdAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--",
      createdAtIso: createdAt || undefined,
      preparationStartedAt: record.preparationStartedAt
        ? String(record.preparationStartedAt)
        : undefined,
      readyAt: record.readyAt ? String(record.readyAt) : undefined,
      elapsed: createdAt ? formatElapsed(createdAt, now) : "00:00",
      status: String(record.status || "PENDENTE") as OrderStatus,
      total: Number(record.total || 0),
      observation:
        String(record.observation || record.notes || "") || undefined,
      completedAt: record.completedAt
        ? new Date(String(record.completedAt)).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    };
  });
}

export function mapRestaurantBrand(
  settings: Record<string, unknown>,
): RestaurantBrand {
  const restaurant =
    (settings.restaurant as Record<string, unknown>) ?? settings;
  const name = String(restaurant.name || settings.restaurantName || "");
  return {
    restaurantName: name,
    monogram: createRestaurantMonogram(name),
    primaryColor: String(settings.primaryColor || "#d64d08"),
  };
}
import { createRestaurantMonogram } from "../../utils/restaurantMonogram";
