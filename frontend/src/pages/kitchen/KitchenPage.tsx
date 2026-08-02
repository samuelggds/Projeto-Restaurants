import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { KitchenModule } from "./KitchenModule";
import type {
  EmployeeWorkspaceData,
  Order,
  OrderChannel,
  OrderStatus,
  RestaurantBrand,
} from "./types";

const POLL_MS = 30_000;

function formatElapsed(createdAt: string): string {
  const diff = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000),
  );
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function mapOrders(raw: unknown[]): Order[] {
  return (raw as Record<string, unknown>[]).map((r) => {
    const type = String(r.orderType || "");
    const channel: OrderChannel =
      type === "TABLE_SESSION"
        ? "TABLE"
        : type === "DELIVERY"
          ? "DELIVERY"
          : "PICKUP";
    const tableNum = (r.tableSession as Record<string, unknown> | null)?.table
      ? (
          (r.tableSession as Record<string, unknown>).table as Record<
            string,
            unknown
          >
        ).number
      : r.tableNumber;
    const reference =
      channel === "TABLE"
        ? `Mesa ${tableNum ?? "?"}`
        : channel === "DELIVERY"
          ? "Delivery"
          : "Retirada";
    const items = ((r.items as Record<string, unknown>[]) || []).map(
      (i) =>
        `${i.quantity}× ${(i.product as Record<string, unknown>)?.name || i.productName || ""}`,
    );
    const iso = String(r.createdAt || "");
    return {
      id: `#${r.id}`,
      channel,
      reference,
      customer:
        String(
          (r.user as Record<string, unknown>)?.name || r.customerName || "",
        ) || undefined,
      items,
      createdAt: iso
        ? new Date(iso).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--",
      elapsed: iso ? formatElapsed(iso) : "00:00",
      status: String(r.status || "PENDENTE") as OrderStatus,
      total: Number(r.total || 0),
      observation: String(r.observation || r.notes || "") || undefined,
      completedAt: r.completedAt
        ? new Date(String(r.completedAt)).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : undefined,
    };
  });
}

export default function KitchenPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeWorkspaceData>({
    orders: [],
    tables: [],
    calls: [],
  });
  const [restaurant, setRestaurant] = useState<RestaurantBrand>({
    restaurantName: "",
    monogram: "R",
    primaryColor: "#d64d08",
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restaurantId =
    Number((user as Record<string, unknown>)?.restaurantId || 0) || null;

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((s: Record<string, unknown>) => {
        const r = (s?.restaurant as Record<string, unknown>) ?? s ?? {};
        const name = String(r?.name || s?.restaurantName || "");
        setRestaurant({
          restaurantName: name,
          monogram:
            name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w: string) => w[0])
              .join("")
              .toUpperCase() || "R",
          primaryColor: String(s?.primaryColor || "#d64d08"),
        });
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await ordersService.listRestaurantOrders();
        setData((prev) => ({
          ...prev,
          orders: mapOrders(Array.isArray(raw) ? raw : []),
        }));
      } catch {
        /* silent */
      }
    };
    load();
    intervalRef.current = setInterval(load, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restaurantId]);

  const u = user as Record<string, unknown>;
  const employee = {
    id: String(u?.id || ""),
    name: String(u?.name || "Cozinheiro"),
    email: String(u?.email || ""),
    role: "KITCHEN" as const,
    shift: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  return (
    <KitchenModule
      employee={employee}
      restaurant={restaurant}
      data={data}
      onUpdateOrderStatus={async (orderId, status) => {
        const numericId = orderId.replace(/^#/, "");
        await ordersService.updateStatus(numericId, status);
        try {
          const raw = await ordersService.listRestaurantOrders();
          setData((prev) => ({
            ...prev,
            orders: mapOrders(Array.isArray(raw) ? raw : []),
          }));
        } catch {
          /* silent */
        }
      }}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    />
  );
}
