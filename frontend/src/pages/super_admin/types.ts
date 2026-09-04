export const SUPER_ADMIN_VIEWS = [
  'overview',
  'restaurants',
  'subscriptions',
  'plans',
  'billing',
  'administrators',
  'support',
  'audit',
  'settings',
] as const;

export type SuperAdminView = (typeof SUPER_ADMIN_VIEWS)[number];
export type TenantStatus = 'ACTIVE' | 'TRIAL' | 'OVERDUE' | 'BLOCKED' | 'CANCELED' | 'UNKNOWN';
export type SubscriptionLifecycleStatus = 'TESTE' | 'ATIVA' | 'EXPIRADA' | 'CANCELADA';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';
export type AdministratorStatus = 'ACTIVE' | 'BLOCKED';
export type SupportStatus = 'OPEN' | 'WAITING_CUSTOMER' | 'CLOSED';
export type RestaurantAccessBlockReason = 'NONE' | 'MANUAL' | 'BILLING';

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface RestaurantAdministratorSummary {
  id: number;
  name: string;
  email: string;
  active: boolean;
  lastAccessAt: string | null;
}

export interface RestaurantSubscription {
  id: number | null;
  planCode: string;
  status: SubscriptionLifecycleStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingAt: string | null;
  monthlyFee: number;
  balanceDebt: number;
  scheduledPlan: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RestaurantTenant {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  active: boolean;
  accessBlockReason: RestaurantAccessBlockReason;
  status: TenantStatus;
  createdAt: string;
  lastAccessAt: string | null;
  nextBillingAt: string | null;
  monthlyFee: number;
  monthlyOrderRevenue: number;
  primaryAdmin: RestaurantAdministratorSummary | null;
  subscription: RestaurantSubscription | null;
}

export interface PlatformPlan {
  code: string;
  name: string;
  description: string;
  monthlyFee: number;
  trialDays: number;
  features: string[];
  featured: boolean;
  active: boolean;
  restaurantsCount: number;
  version: number;
}

export interface Invoice {
  id: number;
  code: string;
  restaurantId: number;
  restaurant: string;
  dueDate: string;
  paidAt: string | null;
  value: number;
  monthlyFee: number;
  systemFees: number;
  status: PaymentStatus;
  paymentLink: string | null;
}

export interface PlatformAdministrator {
  id: number;
  name: string;
  email: string;
  restaurantId: number;
  restaurant: string;
  status: AdministratorStatus;
  lastAccessAt: string | null;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  effectiveMfa: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: number;
  restaurantId: number;
  restaurant: string;
  subject: string;
  status: SupportStatus;
  messageCount: number;
  lastMessageAt: string;
  lastSenderRole: string;
}

export interface SupportMessage {
  id: number;
  restaurantId: number;
  senderRole: string;
  senderLabel: string;
  message: string;
  issueStatus: string | null;
  sentAt: string;
}

export interface AuditLog {
  id: number;
  createdAt: string;
  user: string;
  role: string;
  restaurant: string;
  action: string;
  resource: string;
  ip: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  requestId: string | null;
  userAgent: string | null;
  metadata: unknown;
}

/** Campos persistidos e editáveis pelo SUPER_ADMIN. Credenciais nunca pertencem a este DTO. */
export interface PlatformSettings {
  platformName: string;
  platformDomain: string;
  supportEmail: string;
  primaryColor: string;
  locale: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  allowRestaurantSignup: boolean;
  requireManualApproval: boolean;
  defaultTrialDays: number;
  auditRetentionDays: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  version: number;
  updatedAt: string | null;
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

export type SystemPolicyValue = string | number | boolean | null;

export interface SystemPolicyItem {
  key: string;
  label: string;
  value: SystemPolicyValue;
  description?: string;
  configured?: boolean;
  sensitive?: boolean;
}

export interface SystemPolicies {
  deployment: SystemPolicyItem[];
  email: SystemPolicyItem[];
  integrations: SystemPolicyItem[];
  security: SystemPolicyItem[];
  maintenance: SystemPolicyItem[];
}

export interface SuperAdminData {
  restaurants: RestaurantTenant[];
  metrics: PlatformMetrics;
  plans: PlatformPlan[];
  invoices: Invoice[];
  administrators: PlatformAdministrator[];
  tickets: SupportTicket[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  systemPolicies: SystemPolicies;
}

export interface RestaurantAccessInput {
  active: boolean;
  reason: string;
}
export interface SubscriptionUpdateInput {
  planCode?: string;
  status?: SubscriptionLifecycleStatus;
  trialEndsAt?: string | null;
  nextBillingAt?: string | null;
  reason: string;
}
export interface PlanUpdateInput {
  name: string;
  description: string;
  monthlyFee: number;
  trialDays: number;
  features: string[];
  featured: boolean;
  active: boolean;
  version: number;
}
export interface AdministratorCreateInput {
  name: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}
export interface AdministratorAccessInput {
  active: boolean;
  reason: string;
}

export interface AdminPortalKeyResult {
  restaurantId: number;
  slug: string;
  key: string;
  expiresAt: string;
  rotationId: number;
}

export interface SuperAdminActions {
  refresh: () => Promise<void>;
  updateSettings: (settings: PlatformSettings) => Promise<void>;
  updatePlan: (code: string, input: PlanUpdateInput) => Promise<void>;
  updateRestaurantAccess: (id: number, input: RestaurantAccessInput) => Promise<void>;
  updateSubscription: (id: number, input: SubscriptionUpdateInput) => Promise<void>;
  createAdministrator: (id: number, input: AdministratorCreateInput) => Promise<void>;
  rotateAdminPortalKey: (id: number) => Promise<AdminPortalKeyResult>;
  revokeAdminPortalKey: (id: number) => Promise<void>;
  updateAdministratorAccess: (id: number, input: AdministratorAccessInput) => Promise<void>;
  getSupportMessages: (restaurantId: number) => Promise<SupportMessage[]>;
  sendSupportMessage: (
    restaurantId: number,
    message: string,
    closeConversation?: boolean,
  ) => Promise<void>;
}