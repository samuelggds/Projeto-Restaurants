import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import restaurantSettingsService from "../../Services/restaurantSettingsService";
import employeesService from "../../Services/employeesService";
import ordersService from "../../Services/ordersService";
import productsService from "../../Services/productsService";
import categoriesService from "../../Services/categoriesService";
import { AdminPage } from "./AdminPage";
import { adminMockSettings, adminMockEmployees } from "./data";
import type { AdminCategory, AdminOrder, AdminProduct, AdminSettings, Employee } from "./types";
import { isPersistentImageSource } from "../../utils/persistentImage";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function mapOrder(value: unknown): AdminOrder {
  const raw = asRecord(value); const user = asRecord(raw.user ?? raw.customer); const numericId = Number(raw.id ?? 0);
  return { id: String(raw.orderNumber ?? `#${numericId}`), numericId,
    userId: String(raw.userId ?? user.id ?? "") || undefined,
    customerName: String(user.name ?? raw.customerName ?? "Cliente"),
    customerEmail: String(user.email ?? raw.customerEmail ?? "") || undefined,
    status: String(raw.status ?? "PENDENTE"), total: Number(raw.total ?? raw.totalAmount ?? 0),
    paid: Boolean(raw.paid ?? raw.paymentConfirmed), type: String(raw.type ?? raw.orderType ?? ""),
    createdAt: String(raw.createdAt ?? "") || undefined };
}

function mapProduct(value: unknown): AdminProduct {
  const raw = asRecord(value); const category = asRecord(raw.category);
  return { id: String(raw.id ?? ""), categoryId: Number(raw.categoryId ?? category.id ?? 0),
    name: String(raw.name ?? "Produto"), category: String(category.name ?? raw.categoryName ?? "Sem categoria"),
    price: Number(raw.price ?? 0), image: String(raw.image ?? raw.imageUrl ?? ""),
    description: String(raw.description ?? ""), stock: Number(raw.stock ?? 0), active: raw.active !== false };
}

function mapSettingsFromApi(raw: Record<string, unknown>): AdminSettings {
  const r = (raw?.restaurant as Record<string, unknown>) ?? {};
  const logoCandidate = r?.logo ?? raw?.restaurantLogo ?? adminMockSettings.logoUrl ?? "";
  return {
    restaurantName: String(
      r?.name ?? raw?.restaurantName ?? adminMockSettings.restaurantName,
    ),
    logoUrl: isPersistentImageSource(logoCandidate) ? String(logoCandidate) : "",
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
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  async function loadOperations() {
    const [orderData, productData, categoryData] = await Promise.all([
      ordersService.listRestaurantOrders(), productsService.listProducts(), categoriesService.listCategories(),
    ]);
    setOrders(orderData.map(mapOrder)); setProducts(productData.map(mapProduct));
    setCategories(categoryData.map((value: unknown) => { const raw = asRecord(value); return { id: Number(raw.id), name: String(raw.name), active: raw.active !== false }; }));
  }

  useEffect(() => {
    let mounted = true;
    Promise.resolve().then(async () => {
      if (mounted) await loadOperations();
    }).catch((error) => console.error("Não foi possível carregar a operação.", error));
    return () => { mounted = false; };
  }, []);

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
      .catch((error) => {
        console.error("Não foi possível carregar as configurações.", error);
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
      .catch((error) => {
        console.error("Não foi possível carregar os funcionários.", error);
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
    } catch (error) {
      console.error("Não foi possível salvar as configurações.", error);
      throw error;
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
      const mappedEmployee = mapEmployee(created as Record<string, unknown>);
      setEmployees((prev) => [
        ...prev,
        mappedEmployee,
      ]);
      return mappedEmployee;
    } catch (error) {
      console.error("Não foi possível criar o funcionário.", error);
      throw error;
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
      return employee;
    } catch (error) {
      console.error("Não foi possível atualizar o funcionário.", error);
      throw error;
    }
  }

  return (
    <AdminPage
      key={`${settingsId}-${employees.length}`}
      initialSettings={settings}
      initialEmployees={employees}
      initialOrders={orders}
      initialProducts={products}
      initialCategories={categories}
      onUpdateOrderStatus={async (id, status) => { await ordersService.updateStatus(id, status); await loadOperations(); }}
      onSaveProduct={async (product) => {
        const payload = { name: product.name, description: product.description || "", image: product.image || "", price: product.price,
          categoryId: product.categoryId, active: product.active !== false, featured: false, preparationTime: 20, stock: product.stock ?? null };
        if (product.id) await productsService.updateProduct(product.id, payload);
        else await productsService.createProduct(payload);
        await loadOperations();
      }}
      onDeleteProduct={async (id) => { await productsService.deleteProduct(id); await loadOperations(); }}
      onCreateCategory={async (name) => { await categoriesService.createCategory({ name, active: true }); await loadOperations(); }}
      onUpdateCategory={async (id, name) => { await categoriesService.updateCategory(id, { name }); await loadOperations(); }}
      onDeleteCategory={async (id) => { await categoriesService.deleteCategory(id); await loadOperations(); }}
      onSaveSettings={handleSaveSettings}
      onCreateEmployee={handleCreateEmployee}
      onUpdateEmployee={handleUpdateEmployee}
      onDeactivateEmployee={async (id) => {
        await employeesService.deactivateEmployee(id);
        setEmployees((current) => current.map((employee) => employee.id === id ? { ...employee, active: false } : employee));
      }}
      onViewStore={() => navigate("/")}
      onLogout={() => {
        logout();
        navigate("/login");
      }}
    />
  );
}
