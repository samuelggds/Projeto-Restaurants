export type ManagedServicePlan = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL' | string;
export type ManagedServiceSubscriptionStatus = 'TESTE' | 'ATIVA' | 'EXPIRADA' | 'CANCELADA' | string;

export function hasActiveSubscription(status: ManagedServiceSubscriptionStatus | null | undefined) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'ATIVA' || normalized === 'TESTE';
}

export function hasImplementationAccess(
  plan: ManagedServicePlan | null | undefined,
  status: ManagedServiceSubscriptionStatus | null | undefined,
) {
  const normalized = String(plan || '').trim().toUpperCase();
  return (
    hasActiveSubscription(status) &&
    (normalized === 'PREMIUM' || normalized === 'GESTAO_TOTAL')
  );
}

export function hasContinuousManagementAccess(
  plan: ManagedServicePlan | null | undefined,
  status: ManagedServiceSubscriptionStatus | null | undefined,
) {
  return (
    hasActiveSubscription(status) &&
    String(plan || '').trim().toUpperCase() === 'GESTAO_TOTAL'
  );
}
