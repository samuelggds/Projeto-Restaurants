import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import restaurantsService from "../../Services/restaurantsService";
import { SuperAdminModule } from "./SuperAdminModule";
import { superAdminMockData } from "./data";
import type { SuperAdminData } from "./types";
import {
  buildPlatformMetrics,
  deriveAdministrators,
  derivePlans,
  mapRestaurantTenant,
} from "./adapters/superAdminDataAdapter";

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
          mapRestaurantTenant(r as Record<string, unknown>),
        );
        const plans = derivePlans(restaurants);
        const administrators = deriveAdministrators(restaurants);
        const metrics = buildPlatformMetrics(restaurants, rawMetrics);

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
