import { hasActiveTemporaryBillingAccess } from '../utils/temporaryBillingAccess.js';

export type RestaurantPlan = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL' | string;
export type RestaurantSubscriptionStatus = 'TESTE' | 'ATIVA' | 'EXPIRADA' | 'CANCELADA' | string;

export function hasActiveRestaurantPlan(
  status: RestaurantSubscriptionStatus | null | undefined,
) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'ATIVA' || normalized === 'TESTE';
}

/**
 * Only the server-authorized SUPER_ADMIN billing grant may temporarily lift
 * subscription/plan feature gates. Never infer this grant from client input.
 * The grant cannot revive canceled subscriptions or a manually suspended tenant.
 * Its expiry is evaluated on EVERY protected request.
 */
export type RestaurantFeatureGrant = {
  active: boolean;
  accessBlockReason: string;
  billingTemporaryAccessUntil: Date | null;
};

export function hasTemporaryFullFeatureAccess(
  subscriptionStatus: RestaurantSubscriptionStatus | null | undefined,
  restaurant: RestaurantFeatureGrant | null | undefined,
  now: Date = new Date(),
) {
  const status = String(subscriptionStatus || '').trim().toUpperCase();
  return Boolean(
    restaurant?.active === true &&
    restaurant.accessBlockReason === 'NONE' &&
    (status === 'ATIVA' || status === 'TESTE' || status === 'EXPIRADA') &&
    hasActiveTemporaryBillingAccess(restaurant.billingTemporaryAccessUntil, now)
  );
}

export function hasPremiumFeatureAccess(
  plan: RestaurantPlan | null | undefined,
  status: RestaurantSubscriptionStatus | null | undefined,
  restaurant?: RestaurantFeatureGrant | null,
  now: Date = new Date(),
) {
  const normalized = String(plan || '').trim().toUpperCase();
  return hasTemporaryFullFeatureAccess(status, restaurant, now) || (
    hasActiveRestaurantPlan(status) &&
    (normalized === 'PREMIUM' || normalized === 'GESTAO_TOTAL')
  );
}

export function hasCustomDomainAccess(
  plan: RestaurantPlan | null | undefined,
  status: RestaurantSubscriptionStatus | null | undefined,
  restaurant?: RestaurantFeatureGrant | null,
  now: Date = new Date(),
) {
  return hasPremiumFeatureAccess(plan, status, restaurant, now);
}

export function hasHostedLandingAccess(
  plan: RestaurantPlan | null | undefined,
  status: RestaurantSubscriptionStatus | null | undefined,
  restaurant?: RestaurantFeatureGrant | null,
  now: Date = new Date(),
) {
  return hasTemporaryFullFeatureAccess(status, restaurant, now) || (
    hasActiveRestaurantPlan(status) &&
    String(plan || '').trim().toUpperCase() === 'GESTAO_TOTAL'
  );
}

/** NFC is a contracted feature, not an editable front-end setting. */
export function hasNfcCardAccess(
  plan: RestaurantPlan | null | undefined,
  status: RestaurantSubscriptionStatus | null | undefined,
  restaurant?: RestaurantFeatureGrant | null,
  now: Date = new Date(),
) {
  return hasPremiumFeatureAccess(plan, status, restaurant, now);
}
