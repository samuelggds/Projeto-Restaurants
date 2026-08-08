import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../Services/api";
import ordersService from "../../Services/ordersService";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import { useAuth } from "../../contexts/authContext";
import { ProfilePage } from "./ProfilePage";
import { profileMockData } from "./data";
import type { ProfileData, ProfileOrder, ProfileOrderStatus } from "./types";

const ACTIVE_STATUSES = new Set([
  "PENDENTE",
  "PREPARANDO",
  "PRONTO",
  "SAIU_PARA_ENTREGA",
]);
const ORDER_IMG =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80";

function mapStatus(s: string): ProfileOrderStatus {
  const n = String(s || "").toUpperCase();
  if (n === "SAIU_PARA_ENTREGA") return "onTheWay";
  if (n === "ENTREGUE") return "delivered";
  if (n === "PREPARANDO" || n === "PRONTO") return "preparing";
  return "confirmed";
}

function buildSummary(order: Record<string, unknown>): string {
  const items = Array.isArray(order.items)
    ? (order.items as Record<string, unknown>[])
    : [];
  if (!items.length) return "Pedido";
  const first = String(
    (items[0]?.product as Record<string, unknown>)?.name ||
      items[0]?.name ||
      "Item",
  );
  return items.length > 1
    ? `${first} + ${items.length - 1} ${items.length === 2 ? "item" : "itens"}`
    : first;
}

function resizeToSquareBase64(
  file: File,
  size: number,
  quality: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      const scale = Math.max(size / img.width, size / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      ctx.drawImage(img, (size - sw) / 2, (size - sh) / 2, sw, sh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem"));
    };
    img.src = url;
  });
}

export default function Profile() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(
    null,
  );
  const [localAvatar, setLocalAvatar] = useState("");
  // Derived: prefer a locally-uploaded photo until the auth context reflects the new avatar
  const avatarUrl =
    localAvatar || String((user as Record<string, unknown>)?.avatar || "");

  // Brand info from public settings of the user's restaurant
  useEffect(() => {
    const rid = Number(
      (user as Record<string, unknown>)?.restaurantId ||
        localStorage.getItem("menuRestaurantId") ||
        0,
    );
    if (!rid) return;
    let active = true;
    restaurantSettingsService
      .getPublicSettings(rid)
      .then((d) => {
        if (active) setSettings(d ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  // User's orders
  useEffect(() => {
    let active = true;
    ordersService
      .listMyOrders()
      .then((raw: unknown) => {
        if (!active) return;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as Record<string, unknown>)?.orders)
            ? ((raw as Record<string, unknown>).orders as unknown[])
            : [];
        setOrders(list as Record<string, unknown>[]);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const data: ProfileData = useMemo(() => {
    const r = (settings?.restaurant as Record<string, unknown>) ?? {};
    const brand = {
      name: String(
        r?.name || settings?.restaurantName || profileMockData.brand.name,
      ),
      monogram:
        String(r?.name || "")
          .split(" ")
          .filter(Boolean)
          .slice(0, 2)
          .map((w: string) => w[0])
          .join("")
          .toUpperCase() || "R",
      address: String(settings?.address || profileMockData.brand.address),
      primaryColor: String(
        settings?.primaryColor || profileMockData.brand.primaryColor,
      ),
      logoUrl: String(r?.logo || ""),
    };

    const fullName = String(user?.name || "");
    const firstName = fullName.split(" ").filter(Boolean)[0] || "";
    const mainAddress =
      [
        user?.address,
        (user as Record<string, unknown>)?.number
          ? `nº ${(user as Record<string, unknown>).number}`
          : "",
        (user as Record<string, unknown>)?.district,
        user?.city,
        (user as Record<string, unknown>)?.state,
      ]
        .filter(Boolean)
        .join(", ") || profileMockData.user.mainAddress;

    const profileUser = {
      firstName,
      fullName,
      email: String(user?.email || ""),
      phone: String((user as Record<string, unknown>)?.phone || ""),
      avatarUrl,
      mainAddress,
      favoriteCount: 0,
    };

    const activeRaw = orders.find((o) =>
      ACTIVE_STATUSES.has(String(o.status || "").toUpperCase()),
    );
    const activeOrder = activeRaw
      ? {
          id: `#${String(activeRaw.id).padStart(4, "0")}`,
          status: mapStatus(String(activeRaw.status)),
          estimatedArrival: "--:--",
        }
      : undefined;

    const recentOrders: ProfileOrder[] = orders
      .filter(
        (o) =>
          !["", undefined].includes(
            String(o.status || "").toUpperCase() as never,
          ),
      )
      .map((o) => ({
        id: `#${String(o.id).padStart(4, "0")}`,
        summary: buildSummary(o),
        date: o.createdAt
          ? new Date(String(o.createdAt)).toLocaleDateString("pt-BR")
          : "",
        total: Number(o.total || 0),
        image: ORDER_IMG,
        status: mapStatus(String(o.status || "")),
      }));

    const addresses = user?.address
      ? [
          {
            id: "1",
            label: "Principal",
            address: String(user.address),
            complement: String(
              (user as Record<string, unknown>).complement || "",
            ),
            isDefault: true,
          },
        ]
      : [];

    return { brand, user: profileUser, activeOrder, recentOrders, addresses };
  }, [user, settings, orders, avatarUrl]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleUploadAvatar = useCallback(
    async (file: File) => {
      const base64 = await resizeToSquareBase64(file, 160, 0.8);
      await api.put("/auth/profile", { avatar: base64 });
      setLocalAvatar(base64);
      const token = localStorage.getItem("token") || "";
      if (token) login({ ...(user ?? {}), avatar: base64 }, token);
    },
    [user, login],
  );

  const handleSavePersonalData = useCallback(
    async (payload: { name: string; email: string; phone: string }) => {
      const { data: updated } = await api.put("/auth/profile", payload);
      // Sync auth context immediately so useMemo recomputes without a refresh
      const token = localStorage.getItem("token") || "";
      if (token && updated) login({ ...(user ?? {}), ...updated }, token);
    },
    [user, login],
  );

  const handleChangePassword = useCallback(
    async (payload: { currentPassword: string; newPassword: string }) => {
      await api.put("/auth/password", payload);
    },
    [],
  );

  return (
    <ProfilePage
      data={data}
      cartCount={0}
      onGoHome={() => navigate("/")}
      onOpenMenu={() => navigate("/")}
      onLogout={handleLogout}
      onUploadAvatar={handleUploadAvatar}
      onSavePersonalData={handleSavePersonalData}
      onChangePassword={handleChangePassword}
      onTrackOrder={(orderId) =>
        navigate(`/orders/${String(orderId).replace(/^#/, "")}/tracking`)
      }
    />
  );
}
