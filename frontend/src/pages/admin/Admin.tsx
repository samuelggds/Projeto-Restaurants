import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import employeesService from "../../Services/employeesService";
import { AdminPage } from "./AdminPage";
import { adminMockSettings, adminMockEmployees } from "./data";
import type { AdminSettings, Employee } from "./types";

function mapSettingsFromApi(raw: Record<string, unknown>): AdminSettings {
  const r = (raw?.restaurant as Record<string, unknown>) ?? {};
  return {
    restaurantName: String(
      r?.name ?? raw?.restaurantName ?? adminMockSettings.restaurantName,
    ),
    logoUrl: String(
      r?.logo ?? raw?.restaurantLogo ?? adminMockSettings.logoUrl ?? "",
    ),
    primaryColor: String(raw?.primaryColor ?? adminMockSettings.primaryColor),
    description: String(raw?.description ?? adminMockSettings.description),
    whatsapp: String(raw?.whatsapp ?? adminMockSettings.whatsapp),
    instagram: String(raw?.instagram ?? adminMockSettings.instagram),
    facebook: String(raw?.facebook ?? adminMockSettings.facebook),
    minimumOrder: Number(raw?.minimumOrder ?? adminMockSettings.minimumOrder),
    deliveryTime: Number(
      raw?.averageDeliveryTime ?? adminMockSettings.deliveryTime,
    ),
    tableOrderingEnabled: Boolean(
      raw?.tableOrderingEnabled ?? adminMockSettings.tableOrderingEnabled,
    ),
  };
}

function mapSettingsToApi(settings: AdminSettings): Record<string, unknown> {
  return {
    restaurantName: settings.restaurantName,
    restaurantLogo: settings.logoUrl,
    primaryColor: settings.primaryColor,
    description: settings.description,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    facebook: settings.facebook,
    minimumOrder: settings.minimumOrder,
    averageDeliveryTime: settings.deliveryTime,
    tableOrderingEnabled: settings.tableOrderingEnabled,
  };
}

function mapEmployee(raw: Record<string, unknown>): Employee {
  const sub = String(raw?.subRole ?? "");
  let role: Employee["role"] = "ATTENDANT";
  if (sub === "COZINHA") role = "COOK";
  else if (sub === "GARCOM") role = "WAITER";
  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? ""),
    email: String(raw?.email ?? ""),
    role,
    active: raw?.active !== false,
    permissions: {
      viewOrders: true,
      updateOrderStatus: true,
      manageQrTables: Boolean(
        (raw?.permissions as Record<string, unknown>)?.manageQrTables,
      ),
    },
  };
}

const subRoleMap: Record<Employee["role"], string | null> = {
  COOK: "COZINHA",
  WAITER: "GARCOM",
  ATTENDANT: null,
};

export default function Admin() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [settings, setSettings] = useState<AdminSettings>(adminMockSettings);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [employees, setEmployees] = useState<Employee[]>(adminMockEmployees);

  useEffect(() => {
    let mounted = true;
    restaurantSettingsService
      .getMySettings()
      .then((data) => {
        if (!mounted) return;
        setSettingsId(
          Number((data as Record<string, unknown>)?.id ?? 0) || null,
        );
        setSettings(mapSettingsFromApi(data as Record<string, unknown>));
      })
      .catch(() => {
        /* usar mock */
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    employeesService
      .listEmployees()
      .then((data) => {
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0)
          setEmployees(
            data.map((e) => mapEmployee(e as Record<string, unknown>)),
          );
      })
      .catch(() => {
        /* usar mock */
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSaveSettings(updated: AdminSettings) {
    const payload = mapSettingsToApi(updated);
    try {
      if (settingsId) {
        await restaurantSettingsService.updateSettings(settingsId, payload);
      } else {
        const created = await restaurantSettingsService.createSettings(payload);
        setSettingsId(
          Number((created as Record<string, unknown>)?.id ?? 0) || null,
        );
      }
    } catch {
      /* silent — UI já mostra "Salvo" */
    }
  }

  async function handleCreateEmployee(employee: Omit<Employee, "id">) {
    try {
      const created = await employeesService.createEmployee({
        name: employee.name,
        email: employee.email,
        role: "FUNCIONARIO",
        subRole: subRoleMap[employee.role],
      });
      setEmployees((prev) => [
        ...prev,
        mapEmployee(created as Record<string, unknown>),
      ]);
    } catch {
      /* silent */
    }
  }

  async function handleUpdateEmployee(employee: Employee) {
    try {
      await employeesService.updateEmployee(employee.id, {
        name: employee.name,
        email: employee.email,
        subRole: subRoleMap[employee.role],
      });
      setEmployees((prev) =>
        prev.map((e) => (e.id === employee.id ? employee : e)),
      );
    } catch {
      /* silent */
    }
  }

  return (
    <AdminPage
      initialSettings={settings}
      initialEmployees={employees}
      onSaveSettings={handleSaveSettings}
      onCreateEmployee={handleCreateEmployee}
      onUpdateEmployee={handleUpdateEmployee}
      onViewStore={() => navigate("/")}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    />
  );
}
