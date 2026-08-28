import type {
  AuditLog,
  Invoice,
  PlatformAdministrator,
  PlatformMetrics,
  PlatformPlan,
  PlatformSettings,
  RestaurantTenant,
  SupportMessage,
  SupportTicket,
  SystemPolicies,
  SystemPolicyItem,
  SubscriptionLifecycleStatus,
  TenantStatus,
  SuperAdminData,
} from '../types';

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
const number = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const nullableText = (value: unknown): string | null => {
  const parsed = text(value).trim();
  return parsed ? parsed : null;
};

export function mapTenantStatus(value: unknown): TenantStatus {
  const normalized = text(value).trim().toUpperCase().replaceAll(' ', '_');
  if (['ACTIVE', 'ATIVO', 'ATIVA'].includes(normalized)) return 'ACTIVE';
  if (['OVERDUE', 'EM_ATRASO', 'INADIMPLENTE'].includes(normalized)) return 'OVERDUE';
  if (['BLOCKED', 'BLOQUEADO', 'BLOQUEADA'].includes(normalized)) return 'BLOCKED';
  if (['CANCELED', 'CANCELLED', 'CANCELADO', 'EXPIRADO'].includes(normalized)) return 'CANCELED';
  if (['TRIAL', 'TESTE'].includes(normalized)) return 'TRIAL';
  return 'UNKNOWN';
}

function mapSubscriptionStatus(value: unknown): SubscriptionLifecycleStatus {
  const normalized = text(value).toUpperCase();
  if (['TESTE', 'ATIVA', 'EXPIRADA', 'CANCELADA'].includes(normalized))
    return normalized as SubscriptionLifecycleStatus;
  return 'TESTE';
}

export function mapRestaurantTenant(value: unknown): RestaurantTenant {
  const item = record(value);
  const admin = record(item.primaryAdmin ?? item.owner ?? item.admin);
  const subscription = record(item.subscription);
  const active = bool(item.active, mapTenantStatus(item.status) !== 'BLOCKED');
  return {
    id: number(item.id),
    name: text(item.name),
    slug: text(item.slug),
    email: text(item.email),
    phone: nullableText(item.phone),
    active,
    status: mapTenantStatus(item.status ?? subscription.status ?? (active ? 'ACTIVE' : 'BLOCKED')),
    createdAt: text(item.createdAt),
    lastAccessAt: nullableText(item.lastAccessAt ?? item.lastAccess),
    nextBillingAt: nullableText(item.nextBillingAt ?? subscription.nextBillingAt),
    monthlyFee: number(item.monthlyFee ?? subscription.monthlyFee ?? subscription.price),
    monthlyOrderRevenue: number(item.monthlyOrderRevenue ?? item.revenue),
    primaryAdmin: admin.id
      ? {
          id: number(admin.id),
          name: text(admin.name),
          email: text(admin.email),
          active: bool(admin.active, true),
          lastAccessAt: nullableText(admin.lastAccessAt ?? admin.lastLoginAt),
        }
      : null,
    subscription: Object.keys(subscription).length
      ? {
          id: subscription.id == null ? null : number(subscription.id),
          planCode: text(subscription.planCode ?? subscription.plan),
          status: mapSubscriptionStatus(subscription.status),
          trialEndsAt: nullableText(subscription.trialEndsAt),
          currentPeriodStart: nullableText(subscription.currentPeriodStart),
          currentPeriodEnd: nullableText(subscription.currentPeriodEnd),
          nextBillingAt: nullableText(subscription.currentPeriodEnd ?? item.nextBillingAt),
          monthlyFee: number(subscription.monthlyFee ?? subscription.price ?? item.monthlyFee),
          balanceDebt: number(subscription.balanceDebt),
          scheduledPlan: nullableText(subscription.scheduledPlan),
          createdAt: nullableText(subscription.createdAt),
          updatedAt: nullableText(subscription.updatedAt),
        }
      : null,
  };
}

export function mapPlan(value: unknown): PlatformPlan {
  const item = record(value);
  return {
    code: text(item.code ?? item.id),
    name: text(item.name),
    description: text(item.description),
    monthlyFee: number(item.monthlyFee ?? item.price),
    trialDays: number(item.trialDays),
    features: list(item.features)
      .map((feature) => text(feature))
      .filter(Boolean),
    featured: bool(item.featured),
    active: bool(item.active, true),
    restaurantsCount: number(item.restaurantsCount ?? item.restaurants),
    version: number(item.version, 1),
  };
}

function mapInvoice(value: unknown): Invoice {
  const item = record(value);
  const restaurant = record(item.restaurant);
  const normalizedStatus = text(item.status).toUpperCase();
  const allowed = ['PAID', 'PENDING', 'OVERDUE', 'CANCELED', 'REFUNDED'];
  return {
    id: number(item.id),
    code: text(item.code ?? item.id),
    restaurantId: number(item.restaurantId ?? restaurant.id),
    restaurant: text(restaurant.name ?? item.restaurant),
    dueDate: text(item.dueDate),
    paidAt: nullableText(item.paidAt),
    value: number(item.value ?? item.total),
    monthlyFee: number(item.monthlyFee),
    systemFees: number(item.systemFees),
    status: (allowed.includes(normalizedStatus)
      ? normalizedStatus
      : 'PENDING') as Invoice['status'],
    paymentLink: nullableText(item.paymentLink),
  };
}

function mapAdministrator(value: unknown): PlatformAdministrator {
  const item = record(value);
  const restaurant = record(item.restaurant);
  const active = bool(item.active, text(item.status).toUpperCase() !== 'BLOCKED');
  return {
    id: number(item.id),
    name: text(item.name),
    email: text(item.email),
    restaurantId: number(item.restaurantId ?? restaurant.id),
    restaurant: text(restaurant.name ?? item.restaurant),
    status: active ? 'ACTIVE' : 'BLOCKED',
    lastAccessAt: nullableText(item.lastAccessAt ?? item.lastLoginAt),
    mfaEnabled: bool(item.mfaEnabled ?? item.twoFactor),
    mfaRequired: bool(item.mfaRequired),
    effectiveMfa: bool(item.effectiveMfa, bool(item.mfaEnabled ?? item.twoFactor)),
    mustChangePassword: bool(item.mustChangePassword),
    createdAt: text(item.createdAt),
  };
}

function mapTicket(value: unknown): SupportTicket {
  const item = record(value);
  const restaurant = record(item.restaurant);
  const normalizedStatus = text(item.status ?? item.issueStatus, 'OPEN').toUpperCase();
  return {
    id: number(item.id),
    restaurantId: number(item.restaurantId ?? restaurant.id),
    restaurant: text(restaurant.name ?? item.restaurant),
    subject: text(item.subject ?? item.message),
    status: (['OPEN', 'WAITING_CUSTOMER', 'CLOSED'].includes(normalizedStatus)
      ? normalizedStatus
      : 'OPEN') as SupportTicket['status'],
    messageCount: number(item.messageCount, 1),
    lastMessageAt: text(item.lastMessageAt ?? item.sentAt ?? item.createdAt),
    lastSenderRole: text(item.lastSenderRole ?? item.senderRole),
  };
}

function mapAuditLog(value: unknown): AuditLog {
  const item = record(value);
  const user = record(item.user);
  const restaurant = record(item.restaurant);
  const normalizedResult = text(item.result, 'SUCCESS').toUpperCase();
  return {
    id: number(item.id),
    createdAt: text(item.createdAt ?? item.date),
    user: text(user.name ?? item.user ?? item.userName, 'Sistema'),
    role: text(user.role ?? item.role),
    restaurant: text(restaurant.name ?? item.restaurant, 'Plataforma'),
    action: text(item.action),
    resource: text(item.resource),
    ip: text(item.ip ?? item.ipAddress, '—'),
    result: (['SUCCESS', 'FAILURE', 'BLOCKED'].includes(normalizedResult)
      ? normalizedResult
      : 'SUCCESS') as AuditLog['result'],
    requestId: nullableText(item.requestId),
    userAgent: nullableText(item.userAgent),
    metadata: item.metadata ?? null,
  };
}

function mapSettings(value: unknown): PlatformSettings {
  const item = record(value);
  return {
    platformName: text(item.platformName),
    platformDomain: text(item.platformDomain ?? item.domain),
    supportEmail: text(item.supportEmail),
    primaryColor: text(item.primaryColor),
    locale: text(item.locale ?? item.language),
    currency: text(item.currency),
    timezone: text(item.timezone),
    dateFormat: text(item.dateFormat),
    allowRestaurantSignup: bool(item.allowRestaurantSignup ?? item.allowSignup),
    requireManualApproval: bool(item.requireManualApproval ?? item.manualApproval),
    defaultTrialDays: number(item.defaultTrialDays ?? item.trialDays),
    auditRetentionDays: number(item.auditRetentionDays ?? item.logRetentionDays),
    maintenanceMode: bool(item.maintenanceMode),
    maintenanceMessage: text(item.maintenanceMessage),
    version: number(item.version, 1),
    updatedAt: nullableText(item.updatedAt),
  };
}

const POLICY_LABELS: Record<string, string> = {
  nodeEnv: 'Ambiente da aplicação',
  emailProvider: 'Provedor de e-mail',
  corsOrigins: 'Origens autorizadas (CORS)',
  mfaRequired: 'MFA obrigatório',
  rateLimit: 'Limite de requisições',
  sentry: 'Monitoramento de erros',
  mercadoPago: 'Mercado Pago',
  pagBank: 'PagBank',
  asaas: 'Asaas',
  stripe: 'Stripe',
  whatsapp: 'WhatsApp',
};
function humanize(key: string) {
  return POLICY_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
}
function policyItems(value: unknown): SystemPolicyItem[] {
  if (Array.isArray(value)) {
    return value.map((entry, index) => {
      const item = record(entry);
      return {
        key: text(item.key, String(index)),
        label: text(item.label, humanize(text(item.key, String(index)))),
        value: (item.value ?? null) as SystemPolicyItem['value'],
        description: nullableText(item.description) ?? undefined,
        configured: typeof item.configured === 'boolean' ? item.configured : undefined,
        sensitive: typeof item.sensitive === 'boolean' ? item.sensitive : undefined,
      };
    });
  }
  return Object.entries(record(value)).map(([key, raw]) => {
    const item = record(raw);
    const structured = Object.keys(item).length > 0;
    return {
      key,
      label: structured ? text(item.label, humanize(key)) : humanize(key),
      value: (structured ? item.value : raw) as SystemPolicyItem['value'],
      description: structured ? (nullableText(item.description) ?? undefined) : undefined,
      configured: structured && typeof item.configured === 'boolean' ? item.configured : undefined,
      sensitive: structured && typeof item.sensitive === 'boolean' ? item.sensitive : undefined,
    };
  });
}
function mapPolicies(value: unknown): SystemPolicies {
  const source = record(value);
  if ('environment' in source || 'authentication' in source || 'passwords' in source) {
    const flatten = (prefix: string, raw: unknown): SystemPolicyItem[] => {
      if (Array.isArray(raw))
        return [{ key: prefix, label: humanize(prefix), value: raw.join(', ') }];
      const nested = record(raw);
      if (Object.keys(nested).length)
        return Object.entries(nested).flatMap(([key, child]) => flatten(key, child));
      return [{ key: prefix, label: humanize(prefix), value: raw as SystemPolicyItem['value'] }];
    };
    return {
      deployment: flatten('environment', source.environment),
      email: [],
      integrations: flatten('secrets', source.secrets),
      security: ['authentication', 'passwords', 'httpRateLimit', 'tenancy'].flatMap((key) =>
        flatten(key, source[key]),
      ),
      maintenance: [],
    };
  }
  return {
    deployment: policyItems(source.deployment),
    email: policyItems(source.email),
    integrations: policyItems(source.integrations),
    security: policyItems(source.security),
    maintenance: policyItems(source.maintenance),
  };
}

export function buildPlatformMetrics(
  restaurants: RestaurantTenant[],
  value: unknown,
): PlatformMetrics {
  const item = record(value);
  const byStatus = (status: TenantStatus) => restaurants.filter((r) => r.status === status).length;
  return {
    restaurantsTotal: number(item.restaurantsTotal, restaurants.length),
    restaurantsActive: number(item.restaurantsActive, byStatus('ACTIVE')),
    restaurantsTrial: number(item.restaurantsTrial, byStatus('TRIAL')),
    restaurantsOverdue: number(item.restaurantsOverdue, byStatus('OVERDUE')),
    restaurantsBlocked: number(item.restaurantsBlocked, byStatus('BLOCKED')),
    restaurantsCanceled: number(item.restaurantsCanceled, byStatus('CANCELED')),
    totalGenerated: number(item.totalGenerated),
    totalReceivable: number(item.totalReceivable),
    pendingInvoicesCount: number(item.pendingInvoicesCount),
    pendingInvoicesTotal: number(item.pendingInvoicesTotal),
    mrr: number(item.mrr),
    monthlyGrowth: list(item.monthlyGrowth).map((entry) => ({
      label: text(record(entry).label),
      count: number(record(entry).count),
    })),
    monthlyRevenue: list(item.monthlyRevenue).map((entry) => ({
      label: text(record(entry).label),
      value: number(record(entry).value),
    })),
  };
}

export function mapSuperAdminDashboard(value: unknown): SuperAdminData {
  const source = record(value);
  const restaurants = list(source.restaurants).map(mapRestaurantTenant);
  return {
    restaurants,
    metrics: buildPlatformMetrics(restaurants, source.metrics),
    plans: list(source.plans).map(mapPlan),
    invoices: list(source.invoices).map(mapInvoice),
    administrators: list(source.administrators).map(mapAdministrator),
    tickets: list(source.tickets).map(mapTicket),
    auditLogs: list(source.auditLogs).map(mapAuditLog),
    settings: mapSettings(source.settings),
    systemPolicies: mapPolicies(source.systemPolicies),
  };
}

export function mapSupportMessages(value: unknown): SupportMessage[] {
  const source = record(value);
  return list(Array.isArray(value) ? value : source.messages).map((entry) => {
    const item = record(entry);
    return {
      id: number(item.id),
      restaurantId: number(item.restaurantId),
      senderRole: text(item.senderRole),
      senderLabel: text(item.senderLabel),
      message: text(item.message),
      issueStatus: nullableText(item.issueStatus),
      sentAt: text(item.sentAt ?? item.createdAt),
    };
  });
}
