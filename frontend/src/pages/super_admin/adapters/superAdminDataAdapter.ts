import type { PlatformAdministrator, PlatformMetrics, Plan, RestaurantTenant, TenantStatus } from "../types";

const PLAN_META: Record<string, { name: string; price: number; features: string[]; featured?: boolean }> = {
  BASICO: { name: "Básico", price: 100, features: ["Cardápio digital", "Pedidos de mesa", "Delivery e retirada", "Até 10 funcionários", "Suporte padrão"] },
  PROFISSIONAL: { name: "Profissional", price: 200, featured: true, features: ["Tudo do Básico", "Funcionários ilimitados", "Relatórios avançados", "WhatsApp", "Suporte prioritário"] },
  PREMIUM: { name: "Premium", price: 300, features: ["Tudo do Profissional", "Recursos personalizados", "SLA dedicado", "Integrações"] },
};

export function mapTenantStatus(status: unknown): TenantStatus {
  if (status === "Ativo") return "ACTIVE";
  if (status === "Bloqueado") return "BLOCKED";
  if (status === "Expirado") return "CANCELED";
  return "TRIAL";
}

export function mapRestaurantTenant(record: Record<string, unknown>): RestaurantTenant {
  const owner = (record.owner as Record<string, unknown> | null) ?? null;
  const subscription = (record.subscription as Record<string, unknown> | null) ?? null;
  return {
    id: String(record.id), name: String(record.name || ""), responsible: String(owner?.name || owner?.email || "—"),
    email: String(record.email || ""), plan: String(subscription?.plan || "—"), status: mapTenantStatus(record.status),
    createdAt: record.createdAt ? new Date(String(record.createdAt)).toLocaleDateString("pt-BR") : "—",
    lastAccess: "—", nextBillingAt: record.nextBillingAt ? new Date(String(record.nextBillingAt)).toLocaleDateString("pt-BR") : null,
    monthlyRevenue: Number(record.revenue || 0),
  };
}

export function derivePlans(restaurants: RestaurantTenant[]): Plan[] {
  const counts = restaurants.reduce<Record<string, number>>((result, restaurant) => {
    const key = restaurant.plan.toUpperCase(); result[key] = (result[key] || 0) + 1; return result;
  }, {});
  return Object.entries(PLAN_META).map(([id, meta]) => ({ id, ...meta, restaurants: counts[id] || 0 }));
}

export function deriveAdministrators(restaurants: RestaurantTenant[]): PlatformAdministrator[] {
  return restaurants.filter((restaurant) => restaurant.responsible !== "—").map((restaurant) => ({
    id: restaurant.id, name: restaurant.responsible, restaurant: restaurant.name, email: restaurant.email,
    status: restaurant.status === "BLOCKED" ? "BLOCKED" as const : "ACTIVE" as const,
    lastAccess: restaurant.lastAccess, twoFactor: false,
  }));
}

export function buildPlatformMetrics(restaurants: RestaurantTenant[], backend: Record<string, unknown>): PlatformMetrics {
  return {
    restaurantsTotal: Number(backend.restaurantsTotal || restaurants.length), restaurantsActive: Number(backend.restaurantsActive || 0),
    restaurantsTrial: restaurants.filter((item) => item.status === "TRIAL").length,
    restaurantsOverdue: restaurants.filter((item) => item.status === "OVERDUE").length,
    restaurantsBlocked: restaurants.filter((item) => item.status === "BLOCKED").length,
    restaurantsCanceled: restaurants.filter((item) => item.status === "CANCELED").length,
    totalGenerated: Number(backend.totalGenerated || 0), totalReceivable: Number(backend.totalReceivable || 0),
    pendingInvoicesCount: Number(backend.pendingInvoicesCount || 0), pendingInvoicesTotal: Number(backend.pendingInvoicesTotal || 0),
    mrr: restaurants.reduce((sum, item) => sum + item.monthlyRevenue, 0),
    monthlyGrowth: backend.monthlyGrowth as { label: string; count: number }[] || [],
    monthlyRevenue: backend.monthlyRevenue as { label: string; value: number }[] || [],
  };
}
