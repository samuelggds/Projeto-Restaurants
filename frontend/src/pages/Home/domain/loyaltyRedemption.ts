import type { LoyaltyCoupon, LoyaltyRedemption, LoyaltySummary } from '../types';

export type LoyaltyRedemptionEntry = {
  coupon: LoyaltyCoupon;
  redemption: LoyaltyRedemption;
};

export function loyaltyRedemptionEntries(summary: LoyaltySummary | null) {
  const seen = new Set<number>();
  const candidates: LoyaltyRedemptionEntry[] = [
    ...(summary?.redemptions || []).map((redemption) => ({
      coupon: redemption.coupon,
      redemption,
    })),
    ...(summary?.rewards.flatMap((reward) =>
      reward.redemptions.map((redemption) => ({ coupon: reward.coupon, redemption })),
    ) || []),
  ];

  return candidates.filter(({ redemption }) => {
    if (seen.has(redemption.id)) return false;
    seen.add(redemption.id);
    return true;
  });
}

function redemptionExpiration(redemption: LoyaltyRedemption) {
  return redemption.expiresAt || redemption.coupon.expiration || null;
}

export function isUnexpiredLoyaltyRedemption(redemption: LoyaltyRedemption, now = Date.now()) {
  if (redemption.expired === true || redemption.status === 'EXPIRED') return false;
  const expiration = redemptionExpiration(redemption);
  if (!expiration) return true;
  const expirationTime = Date.parse(expiration);
  return !Number.isFinite(expirationTime) || expirationTime > now;
}

export function isUsableLoyaltyRedemption(redemption: LoyaltyRedemption, now = Date.now()) {
  return redemption.status === 'CLAIMED' && isUnexpiredLoyaltyRedemption(redemption, now);
}

export function isActiveLoyaltyRedemption(redemption: LoyaltyRedemption, now = Date.now()) {
  if (redemption.status === 'RESERVED') return redemption.expired !== true;
  return redemption.status === 'CLAIMED' && isUnexpiredLoyaltyRedemption(redemption, now);
}
