export type AdminSection =
  | "overview"
  | "orders"
  | "catalog"
  | "customers"
  | "settings"
  | "employees";
export type SettingsSection =
  | "brand"
  | "business"
  | "address"
  | "hours"
  | "orders"
  | "delivery"
  | "table"
  | "whatsapp"
  | "payments"
  | "social"
  | "appearance"
  | "security";
export type EmployeeRole = "COOK" | "WAITER" | "ATTENDANT";

export type AdminOrder = {
  id: string;
  customerName: string;
  status: string;
  total: string;
  createdAt?: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  image: string;
  active?: boolean;
};

export type AdminSettings = {
  restaurantName: string;
  logoUrl?: string;
  primaryColor: string;
  description: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  minimumOrder: number;
  deliveryTime: number;
  tableOrderingEnabled: boolean;
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  active: boolean;
  permissions: {
    viewOrders: boolean;
    updateOrderStatus: boolean;
    manageQrTables: boolean;
  };
};

export type AdminPageProps = {
  initialSettings?: AdminSettings;
  initialEmployees?: Employee[];
  initialOrders?: AdminOrder[];
  initialProducts?: AdminProduct[];
  onSaveSettings?: (settings: AdminSettings) => void | Promise<void>;
  onCreateEmployee?: (employee: Omit<Employee, "id">) => void | Promise<void>;
  onUpdateEmployee?: (employee: Employee) => void | Promise<void>;
  onViewStore?: () => void;
  onLogout?: () => void;
};
