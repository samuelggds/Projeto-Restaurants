export type RestaurantPlan = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL' | string;
export type RestaurantSubscriptionStatus = 'TESTE' | 'ATIVA' | 'EXPIRADA' | 'CANCELADA' | string;

export function hasActiveRestaurantPlan(
  status: RestaurantSubscriptionStatus | null | undefined,
) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'ATIVA' || normalized === 'TESTE';
}

export function hasCustomDomainAccess(
  plan: RestaurantPlan | null | undefined,
  status: RestaurantSubscriptionStatus | null | undefined,
) {
  const normalized = String(plan || '').trim().toUpperCase();
  return (
    hasActiveRestaurantPlan(status) &&
    (normalized === 'PREMIUM' || normalized === 'GESTAO_TOTAL')
  );
}

export function hasHostedLandingAccess(
  plan: RestaurantPlan | null | undefined,
  status: RestaurantSubscriptionStatus | null | undefined,
) {
  return (
    hasActiveRestaurantPlan(status) &&
    String(plan || '').trim().toUpperCase() === 'GESTAO_TOTAL'
  );
}
