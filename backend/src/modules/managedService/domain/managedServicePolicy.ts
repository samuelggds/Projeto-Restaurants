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
    (normalized === 'BASICO' || normalized === 'PREMIUM' || normalized === 'GESTAO_TOTAL')
  );
}

export function managedImplementationProductLimit(
  plan: ManagedServicePlan | null | undefined,
) {
  const normalized = String(plan || '').trim().toUpperCase();
  if (normalized === 'BASICO') return 50;
  if (normalized === 'PREMIUM') return 100;
  return null;
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

/** Automatic initial access is issued only during creation of a new restaurant.
 * It expires, closes irreversibly on completion/revocation, and never applies to
 * legacy restaurants or reactivated/subsequently upgraded subscriptions.
 */
export function hasInitialSetupAccess(
  plan: ManagedServicePlan | null | undefined,
  subscriptionStatus: ManagedServiceSubscriptionStatus | null | undefined,
  implementation: {
    status: string;
    initialSetupExpiresAt: Date | null;
    initialSetupClosedAt: Date | null;
  } | null | undefined,
  now: Date = new Date(),
) {
  if (!hasImplementationAccess(plan, subscriptionStatus) || !implementation) return false;
  if (['CONCLUIDA', 'CANCELADA'].includes(String(implementation.status).toUpperCase())) return false;
  return (
    implementation.initialSetupClosedAt === null &&
    implementation.initialSetupExpiresAt instanceof Date &&
    implementation.initialSetupExpiresAt.getTime() > now.getTime()
  );
}

export function hasManagedWorkspaceAccess(
  plan: ManagedServicePlan | null | undefined,
  status: ManagedServiceSubscriptionStatus | null | undefined,
  implementationStatus?: string | null,
) {
  if (hasContinuousManagementAccess(plan, status)) return true;
  if (!hasImplementationAccess(plan, status)) return false;
  return !['CONCLUIDA', 'CANCELADA'].includes(
    String(implementationStatus || '').trim().toUpperCase(),
  );
}
