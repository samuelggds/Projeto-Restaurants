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
  numericId: number;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  status: string;
  total: number;
  paid?: boolean;
  type?: string;
  paymentMethod?: string;
  payOnDelivery?: boolean;
  payOnDeliveryMethod?: string;
  createdAt?: string;
};

export type AdminProduct = {
  id: string;
  categoryId: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  stock?: number | null;
  active?: boolean;
};

export type AdminCategory = { id: number; name: string; active?: boolean };

export type AdminSettings = {
  restaurantName: string;
  logoUrl?: string;
  coverImageUrl?: string;
  primaryColor: string;
  description: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  minimumOrder: number;
  deliveryTime: number;
  tableOrderingEnabled: boolean;
  pixProvider: string;
  pixKey: string;
  cardGateway: string;
  stripeSecretKey: string;
  stripeSecretKeyConfigured: boolean;
  stripeWebhookSecret: string;
  stripeWebhookSecretConfigured: boolean;
  mercadoPagoAccessToken: string;
  mercadoPagoAccessTokenConfigured: boolean;
  asaasAccessToken: string;
  asaasAccessTokenConfigured: boolean;
  pagbankEmail: string;
  pagbankToken: string;
  pagbankTokenConfigured: boolean;
  mainBannerId?: number;
  mainBannerUrl?: string;
  promotion1Id?: number;
  promotion1Url?: string;
  promotion2Id?: number;
  promotion2Url?: string;
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
  initialCategories?: AdminCategory[];
  onUpdateOrderStatus?: (id: number, status: string) => void | Promise<void>;
  onConfirmOrderPayment?: (id: number) => void | Promise<void>;
  onSaveProduct?: (product: AdminProduct) => void | Promise<void>;
  onDeleteProduct?: (id: string) => void | Promise<void>;
  onCreateCategory?: (name: string) => void | Promise<void>;
  onUpdateCategory?: (id: number, name: string) => void | Promise<void>;
  onDeleteCategory?: (id: number) => void | Promise<void>;
  onOpenSettings?: () => void;
  onSaveSettings?: (settings: AdminSettings) => void | Promise<void>;
  onConnectMercadoPago?: () => void | Promise<void>;
  onConnectPagBank?: () => void | Promise<void>;
  onOnboardAsaas?: (payload: {
    cpf?: string;
    cnpj?: string;
    restaurantName: string;
    pixKey: string;
  }) => void | Promise<void>;
  onCreateEmployee?: (
    employee: Omit<Employee, "id">,
  ) => Employee | Promise<Employee>;
  onUpdateEmployee?: (employee: Employee) => Employee | Promise<Employee>;
  onDeactivateEmployee?: (id: string) => void | Promise<void>;
  onViewStore?: () => void;
  onLogout?: () => void;
};
