import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import restaurantsService from "../../Services/restaurantsService";
import { SuperAdminModule } from "./SuperAdminModule";
import { superAdminMockData } from "./data";
import type {
  PlatformAdministrator,
  PlatformMetrics,
  Plan,
  RestaurantTenant,
  SuperAdminData,
  TenantStatus,
} from "./types";

const PLAN_META: Record<
  string,
  { name: string; price: number; features: string[]; featured?: boolean }
> = {
  BASICO: {
    name: "Básico",
    price: 100,
    features: [
      "Cardápio digital",
      "Pedidos de mesa",
      "Delivery e retirada",
      "Até 10 funcionários",
      "Suporte padrão",
    ],
  },
  PROFISSIONAL: {
    name: "Profissional",
    price: 200,
    featured: true,
    features: [
      "Tudo do Básico",
      "Funcionários ilimitados",
      "Relatórios avançados",
      "WhatsApp",
      "Suporte prioritário",
    ],
  },
  PREMIUM: {
    name: "Premium",
    price: 300,
    features: [
      "Tudo do Profissional",
      "Recursos personalizados",
      "SLA dedicado",
      "Integrações",
    ],
  },
};

function mapStatus(status: string): TenantStatus {
  if (status === "Ativo") return "ACTIVE";
  if (status === "Bloqueado") return "BLOCKED";
  if (status === "Expirado") return "CANCELED";
  return "TRIAL";
}

function mapRestaurant(r: Record<string, unknown>): RestaurantTenant {
  const owner = (r.owner as Record<string, unknown> | null) ?? null;
  const sub = (r.subscription as Record<string, unknown> | null) ?? null;
  return {
    id: String(r.id),
    name: String(r.name || ""),
    responsible: String(owner?.name || owner?.email || "—"),
    email: String(r.email || ""),
    plan: String(sub?.plan || "—"),
    status: mapStatus(String(r.status || "")),
    createdAt: r.createdAt
      ? new Date(String(r.createdAt)).toLocaleDateString("pt-BR")
      : "—",
    lastAccess: "—",
    nextBillingAt: r.nextBillingAt
      ? new Date(String(r.nextBillingAt)).toLocaleDateString("pt-BR")
      : null,
    monthlyRevenue: Number(r.revenue || 0),
  };
}

function derivePlans(restaurants: RestaurantTenant[]): Plan[] {
  const counts: Record<string, number> = {};
  restaurants.forEach((r) => {
    const key = r.plan.toUpperCase();
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(PLAN_META).map(([key, meta]) => ({
    id: key,
    name: meta.name,
    price: meta.price,
    restaurants: counts[key] || 0,
    featured: meta.featured,
    features: meta.features,
  }));
}

function deriveAdministrators(
  restaurants: RestaurantTenant[],
): PlatformAdministrator[] {
  return restaurants
    .filter((r) => r.responsible !== "—")
    .map((r) => ({
      id: r.id,
      name: r.responsible,
      restaurant: r.name,
      email: r.email,
      status:
        r.status === "BLOCKED" ? ("BLOCKED" as const) : ("ACTIVE" as const),
      lastAccess: r.lastAccess,
      twoFactor: false,
    }));
}

function buildMetrics(
  restaurants: RestaurantTenant[],
  backend: Record<string, unknown>,
): PlatformMetrics {
  const mrr = restaurants.reduce((s, r) => s + r.monthlyRevenue, 0);
  const rawGrowth = backend.monthlyGrowth as
    | { label: string; count: number }[]
    | undefined;
  const rawRevenue = backend.monthlyRevenue as
    | { label: string; value: number }[]
    | undefined;
  return {
    restaurantsTotal: Number(backend.restaurantsTotal || restaurants.length),
    restaurantsActive: Number(backend.restaurantsActive || 0),
    restaurantsTrial: restaurants.filter((r) => r.status === "TRIAL").length,
    restaurantsOverdue: restaurants.filter((r) => r.status === "OVERDUE")
      .length,
    restaurantsBlocked: restaurants.filter((r) => r.status === "BLOCKED")
      .length,
    restaurantsCanceled: restaurants.filter((r) => r.status === "CANCELED")
      .length,
    totalGenerated: Number(backend.totalGenerated || 0),
    totalReceivable: Number(backend.totalReceivable || 0),
    pendingInvoicesCount: Number(backend.pendingInvoicesCount || 0),
    pendingInvoicesTotal: Number(backend.pendingInvoicesTotal || 0),
    mrr,
    monthlyGrowth: rawGrowth ?? [],
    monthlyRevenue: rawRevenue ?? [],
  };
}

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SuperAdminData>(superAdminMockData);

  useEffect(() => {
    Promise.allSettled([
      restaurantsService.listRestaurants(),
      restaurantsService.getMetrics(),
      restaurantsService.getAllInvoices(),
      restaurantsService.getAllSupportTickets(),
      restaurantsService.getAuditLogs(),
    ]).then(
      ([
        restaurantsResult,
        metricsResult,
        invoicesResult,
        ticketsResult,
        auditResult,
      ]) => {
        const rawList =
          restaurantsResult.status === "fulfilled" &&
          Array.isArray(restaurantsResult.value)
            ? restaurantsResult.value
            : null;
        const rawMetrics =
          metricsResult.status === "fulfilled" && metricsResult.value
            ? (metricsResult.value as Record<string, unknown>)
            : {};
        const rawInvoices =
          invoicesResult.status === "fulfilled" &&
          Array.isArray(invoicesResult.value)
            ? invoicesResult.value
            : null;
        const rawTickets =
          ticketsResult.status === "fulfilled" &&
          Array.isArray(ticketsResult.value)
            ? ticketsResult.value
            : null;
        const rawAuditLogs =
          auditResult.status === "fulfilled" && Array.isArray(auditResult.value)
            ? auditResult.value
            : null;

        if (!rawList) return;

        const restaurants = rawList.map((r) =>
          mapRestaurant(r as Record<string, unknown>),
        );
        const plans = derivePlans(restaurants);
        const administrators = deriveAdministrators(restaurants);
        const metrics = buildMetrics(restaurants, rawMetrics);

        setData((prev) => ({
          ...prev,
          restaurants,
          plans,
          administrators,
          metrics,
          ...(rawInvoices ? { invoices: rawInvoices } : {}),
          ...(rawTickets ? { tickets: rawTickets } : {}),
          ...(rawAuditLogs ? { auditLogs: rawAuditLogs } : {}),
        }));
      },
    );
  }, []);

  const u = user as Record<string, unknown>;

  return (
    <SuperAdminModule
      currentUser={{
        id: String(u?.id || ""),
        name: String(u?.name || "Super Admin"),
        email: String(u?.email || ""),
        role: "SUPER_ADMIN",
      }}
      data={data}
      onCreateRestaurant={() => {
        /* handled inside module */
      }}
      onSelectRestaurant={() => {
        /* detail view not yet implemented */
      }}
      onSaveSettings={async () => {
        /* settings API not yet implemented */
      }}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    />
  );
}
