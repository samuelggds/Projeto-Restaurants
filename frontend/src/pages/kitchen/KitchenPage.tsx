import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { connectSocket, disconnectSocket } from "../../Services/socketService";
import { getStoredAccessToken } from "../../modules/auth/session/authSession";
import { KitchenModule } from "./KitchenModule";
import type {
  EmployeeWorkspaceData,
  RestaurantBrand,
} from "./types";
import { mapOperationalOrders, mapRestaurantBrand } from "../operations/orderAdapter";

const POLL_MS = 30_000;

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

  const loadOrders = useCallback(async () => {
    const raw = await ordersService.listRestaurantOrders();
    setData((prev) => ({
      ...prev,
      orders: mapOperationalOrders(Array.isArray(raw) ? raw : []),
    }));
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantSettingsService
      .getPublicSettings(restaurantId)
      .then((s: Record<string, unknown>) => {
        setRestaurant(mapRestaurantBrand(s));
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    const load = async () => {
      try {
        await loadOrders();
      } catch {
        /* silent */
      }
    };
    load();
    intervalRef.current = setInterval(load, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restaurantId, loadOrders]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token || !restaurantId) return;

    const socket = connectSocket(token, "kitchen-orders");
    const refreshOrders = () => {
      void loadOrders().catch(() => {});
    };

    socket.on("new-order", refreshOrders);
    socket.on("order:payment-confirmed", refreshOrders);
    socket.on("order:status-changed", refreshOrders);

    return () => {
      socket.off("new-order", refreshOrders);
      socket.off("order:payment-confirmed", refreshOrders);
      socket.off("order:status-changed", refreshOrders);
      disconnectSocket();
    };
  }, [restaurantId, loadOrders]);

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
          await loadOrders();
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
