import { profileMockData } from "../data";
import type { ProfileAddress, ProfileData, ProfileFavorite, ProfileOrder, ProfileOrderStatus } from "../types";
import { createRestaurantMonogram } from "../../../utils/restaurantMonogram";

const ACTIVE_STATUSES = new Set(["PENDENTE", "PREPARANDO", "PRONTO", "SAIU_PARA_ENTREGA"]);
const ORDER_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80";

export function mapOrderStatus(status: unknown): ProfileOrderStatus {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SAIU_PARA_ENTREGA") return "onTheWay";
  if (normalized === "ENTREGUE") return "delivered";
  if (normalized === "PREPARANDO" || normalized === "PRONTO") return "preparing";
  return "confirmed";
}

export function buildOrderSummary(order: Record<string, unknown>): string {
  const items = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  if (!items.length) return "Pedido";
  const product = items[0]?.product as Record<string, unknown> | undefined;
  const first = String(product?.name || items[0]?.name || "Item");
  return items.length > 1 ? `${first} + ${items.length - 1} ${items.length === 2 ? "item" : "itens"}` : first;
}

type Input = {
  user: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  orders: Record<string, unknown>[];
  favorites: Record<string, unknown>[];
  addresses: Record<string, unknown>[];
  avatarUrl: string;
};

function firstProductImage(order: Record<string, unknown>): string {
  const items = Array.isArray(order.items) ? order.items as Record<string, unknown>[] : [];
  const product = items[0]?.product as Record<string, unknown> | undefined;
  return String(product?.image || items[0]?.image || ORDER_IMAGE);
}

function estimateArrival(order: Record<string, unknown>, settings: Record<string, unknown> | null) {
  if (String(order.status || "").toUpperCase() === "SAIU_PARA_ENTREGA") {
    return "Consulte o rastreamento";
  }
  const minutes = Math.max(0, Number(settings?.averageDeliveryTime || 0));
  const createdAt = new Date(String(order.createdAt || ""));
  if (!minutes || Number.isNaN(createdAt.getTime())) return "--:--";
  createdAt.setMinutes(createdAt.getMinutes() + minutes);
  return createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function buildProfileData({ user, settings, orders, favorites, addresses: rawAddresses, avatarUrl }: Input): ProfileData {
  const restaurant = (settings?.restaurant as Record<string, unknown>) ?? {};
  const restaurantName = String(restaurant.name || "");
  const brand = {
    name: String(restaurantName || settings?.restaurantName || profileMockData.brand.name),
    monogram: createRestaurantMonogram(restaurantName || settings?.restaurantName),
    address: String(settings?.address || profileMockData.brand.address),
    primaryColor: String(settings?.primaryColor || profileMockData.brand.primaryColor),
    logoUrl: String(restaurant.logo || ""),
  };
  const fullName = String(user?.name || "");
  const defaultAddress = rawAddresses.find((item) => Boolean(item.isDefault)) || rawAddresses[0];
  const mainAddress = defaultAddress
    ? [defaultAddress.address, defaultAddress.number ? `nº ${defaultAddress.number}` : "", defaultAddress.district, defaultAddress.city, defaultAddress.state].filter(Boolean).join(", ")
    : [user?.address, user?.number ? `nº ${user.number}` : "", user?.district, user?.city, user?.state].filter(Boolean).join(", ") || "Nenhum endereço cadastrado";
  const profileUser = {
    firstName: fullName.split(" ").filter(Boolean)[0] || "",
    fullName,
    email: String(user?.email || ""), phone: String(user?.phone || ""), avatarUrl,
    mainAddress, favoriteCount: favorites.length,
  };
  const activeRaw = orders.find((order) => ACTIVE_STATUSES.has(String(order.status || "").toUpperCase()));
  const activeOrder = activeRaw ? {
    id: `#${String(activeRaw.id).padStart(4, "0")}`,
    status: mapOrderStatus(activeRaw.status), estimatedArrival: estimateArrival(activeRaw, settings),
    summary: buildOrderSummary(activeRaw), image: firstProductImage(activeRaw), total: Number(activeRaw.total || 0),
  } : undefined;
  const recentOrders: ProfileOrder[] = orders.filter((order) => String(order.id) !== String(activeRaw?.id || "") && Boolean(String(order.status || ""))).map((order) => ({
    id: `#${String(order.id).padStart(4, "0")}`, summary: buildOrderSummary(order),
    date: order.createdAt ? new Date(String(order.createdAt)).toLocaleDateString("pt-BR") : "",
    total: Number(order.total || 0), image: firstProductImage(order), status: mapOrderStatus(order.status),
  }));
  const addresses: ProfileAddress[] = rawAddresses.map((item) => ({
    id: String(item.id), label: String(item.label || "Endereço"),
    address: `${String(item.address || "")}, ${String(item.number || "")}`,
    number: String(item.number || ""), district: String(item.district || ""),
    city: String(item.city || ""), state: String(item.state || ""), zipCode: String(item.zipCode || ""),
    complement: String(item.complement || ""), isDefault: Boolean(item.isDefault),
  }));
  const profileFavorites: ProfileFavorite[] = favorites.map((item) => ({
    id: String(item.id || ""), name: String(item.name || ""), description: String(item.description || ""),
    price: Number(item.price || 0), image: String(item.image || ""), rating: Number(item.averageRating || 0),
  }));
  return { brand, user: profileUser, activeOrder, recentOrders, addresses, favorites: profileFavorites };
}
