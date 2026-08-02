export type SuperAdminView =
  | "overview"
  | "restaurants"
  | "subscriptions"
  | "plans"
  | "billing"
  | "administrators"
  | "support"
  | "audit"
  | "settings";
export type TenantStatus =
  | "ACTIVE"
  | "TRIAL"
  | "OVERDUE"
  | "BLOCKED"
  | "CANCELED";
export type PaymentStatus = "PAID" | "PENDING" | "OVERDUE" | "REFUNDED";
export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}
export interface RestaurantTenant {
  id: string;
  name: string;
  responsible: string;
  email: string;
  plan: string;
  status: TenantStatus;
  createdAt: string;
  lastAccess: string;
  nextBillingAt: string | null;
  monthlyRevenue: number;
}
export interface Plan {
  id: string;
  name: string;
  price: number | null;
  restaurants: number;
  featured?: boolean;
  features: string[];
}
export interface Invoice {
  id: string;
  restaurant: string;
  dueDate: string;
  value: number;
  method: string;
  status: PaymentStatus;
}
export interface PlatformAdministrator {
  id: string;
  name: string;
  restaurant: string;
  email: string;
  status: "ACTIVE" | "INVITED" | "BLOCKED";
  lastAccess: string;
  twoFactor: boolean;
}
export interface SupportTicket {
  id: string;
  restaurant: string;
  subject: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER";
  responsible: string;
  elapsed: string;
}
export interface AuditLog {
  id: string;
  date: string;
  user: string;
  role: string;
  restaurant: string;
  action: string;
  resource: string;
  ip: string;
  result: "SUCCESS" | "FAILURE" | "BLOCKED";
}
export interface PlatformSettings {
  platformName: string;
  domain: string;
  supportEmail: string;
  primaryColor: string;
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  allowSignup: boolean;
  manualApproval: boolean;
  trialDays: number;
  uploadLimitMb: number;
  logRetentionDays: number;
  adminSessionHours: number;
  maintenanceMode: boolean;
}
export interface SuperAdminData {
  restaurants: RestaurantTenant[];
  plans: Plan[];
  invoices: Invoice[];
  administrators: PlatformAdministrator[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  metrics?: PlatformMetrics;
}
export interface PlatformMetrics {
  restaurantsTotal: number;
  restaurantsActive: number;
  restaurantsTrial: number;
  restaurantsOverdue: number;
  restaurantsBlocked: number;
  restaurantsCanceled: number;
  totalGenerated: number;
  totalReceivable: number;
  pendingInvoicesCount: number;
  pendingInvoicesTotal: number;
  mrr: number;
  monthlyGrowth: { label: string; count: number }[];
  monthlyRevenue: { label: string; value: number }[];
}
export interface SuperAdminModuleProps {
  currentUser: SuperAdminUser;
  data?: SuperAdminData;
  initialView?: SuperAdminView;
  onViewChange?: (view: SuperAdminView) => void;
  onCreateRestaurant?: () => void;
  onSelectRestaurant?: (restaurantId: string) => void;
  onSaveSettings?: (settings: PlatformSettings) => void | Promise<void>;
  onLogout?: () => void;
}
