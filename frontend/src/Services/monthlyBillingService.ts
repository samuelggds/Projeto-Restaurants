import api from './api';

export type PlanCode = 'BASICO' | 'PREMIUM';
export type BillingPlan = {
  plan: PlanCode;
  name: string;
  monthlyFee: number;
  trialDays: number;
  features: string[];
};
export type Subscription = {
  id: number;
  plan: PlanCode;
  status: 'TESTE' | 'ATIVA' | 'EXPIRADA' | 'CANCELADA';
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  scheduledPlan?: PlanCode | null;
  scheduledPlanEffectiveMonth?: number | null;
  scheduledPlanEffectiveYear?: number | null;
  planChangeEligibility?: {
    allowed: boolean;
    invoiceId: number | null;
    reason: string;
  };
};
export type Invoice = {
  id: number;
  month: number;
  year: number;
  monthlyFee: number | string;
  systemFees: number | string;
  total: number | string;
  status: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
  dueDate: string;
  paidAt?: string | null;
  paymentLink?: string | null;
  pixQrCode?: string | null;
  pixQrCodeBase64?: string | null;
  pixExpiresAt?: string | null;
};
export type PlatformBillingProfile = {
  billingMethod: 'PIX' | 'CARD';
  autoRenew: boolean;
  provider?: string | null;
  providerSubscriptionId?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  status: string;
  nextBillingAt?: string | null;
  lastChargeAt?: string | null;
  lastFailureAt?: string | null;
  lastFailureReason?: string | null;
};
export type BillingOverview = {
  invoices: Invoice[];
  billing?: {
    plan: PlanCode;
    subscriptionStatus: string;
    isPlanActive: boolean;
    restaurantCreatedAt?: string | null;
    adminCreatedAt?: string | null;
    adminName?: string | null;
    billingStartedAt?: string | null;
    completedMonths: number;
    currentCycle: number;
    currentInvoiceId?: number | null;
    dueDate?: string | null;
    graceLimitDate?: string | null;
    pixAvailableAt?: string | null;
    pixAvailable: boolean;
  };
};

const monthlyBillingService = {
  async getPlans() {
    return (await api.get<BillingPlan[]>('/billing/plans')).data;
  },
  async getSubscription() {
    return (await api.get<Subscription>('/subscription')).data;
  },
  async getOverview() {
    return (await api.get<BillingOverview>('/billing/invoices')).data;
  },
  async requestPlanChange(plan: PlanCode) {
    return (
      await api.post<Subscription & { message?: string }>('/subscription/change-plan', { plan })
    ).data;
  },
  async generatePix(invoiceId: number) {
    return (
      await api.post<{
        paymentLink?: string | null;
        pixQrCode: string;
        pixQrCodeBase64: string;
        pixExpiresAt?: string | null;
        reused?: boolean;
      }>(`/billing/invoices/${invoiceId}/regenerate-link`)
    ).data;
  },
  async getRecurringProfile() {
    return (await api.get<PlatformBillingProfile>('/billing/recurring')).data;
  },
  async getRecurringConfig() {
    return (
      await api.get<{ provider: 'MERCADO_PAGO'; publicKey: string }>('/billing/recurring/config')
    ).data;
  },
  async enableRecurringCard(payload: {
    cardToken: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }) {
    return (await api.post<PlatformBillingProfile>('/billing/recurring/card', payload)).data;
  },
  async usePixBilling() {
    return (await api.put<PlatformBillingProfile>('/billing/recurring/pix')).data;
  },
};

export default monthlyBillingService;
