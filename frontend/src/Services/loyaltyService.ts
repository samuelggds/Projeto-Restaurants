import api from './api';
import type {
  LoyaltyCoupon,
  LoyaltyRedemption,
  LoyaltyRewardProgress,
  LoyaltySummary,
} from '../pages/Home/types';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCoupon(value: unknown): LoyaltyCoupon | null {
  const coupon = asRecord(value);
  const id = Math.trunc(finiteNumber(coupon.id));
  if (id <= 0) return null;
  const code = String(coupon.code || '')
    .trim()
    .toUpperCase();
  const discountType = coupon.discountType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
  return {
    id,
    code,
    title: String(coupon.title || code || 'Benefício de fidelidade'),
    description: String(coupon.description || ''),
    discountType,
    discount: Math.max(0, finiteNumber(coupon.discount)),
    minimumSubtotal: Math.max(0, finiteNumber(coupon.minimumSubtotal)),
    maxDiscount:
      coupon.maxDiscount === null || coupon.maxDiscount === undefined
        ? null
        : Math.max(0, finiteNumber(coupon.maxDiscount)),
    expiration: coupon.expiration ? String(coupon.expiration) : null,
    redemptionValidityDays: Math.max(
      1,
      Math.trunc(finiteNumber(coupon.redemptionValidityDays, 30)),
    ),
    loyaltyPurchasesRequired: Math.max(
      1,
      Math.trunc(finiteNumber(coupon.loyaltyPurchasesRequired, 1)),
    ),
    perCustomerLimit: Math.max(1, Math.trunc(finiteNumber(coupon.perCustomerLimit, 1))),
  };
}

function normalizeRedemption(
  value: unknown,
  fallbackCoupon: LoyaltyCoupon,
): LoyaltyRedemption | null {
  const redemption = asRecord(value);
  const id = Math.trunc(finiteNumber(redemption.id));
  if (id <= 0) return null;
  const status = String(redemption.status || '').toUpperCase();
  if (!['CLAIMED', 'RESERVED', 'USED', 'EXPIRED'].includes(status)) return null;
  return {
    id,
    cycle: Math.max(1, Math.trunc(finiteNumber(redemption.cycle, 1))),
    status: status as LoyaltyRedemption['status'],
    expiresAt: redemption.expiresAt ? String(redemption.expiresAt) : null,
    expired: redemption.expired === true || status === 'EXPIRED',
    coupon: normalizeCoupon(redemption.coupon) || fallbackCoupon,
  };
}

export function normalizeLoyaltySummary(payload: unknown): LoyaltySummary {
  const root = asRecord(payload);
  const content = asRecord(root.loyalty || root.data || root);
  const rawRewards = Array.isArray(content.rewards)
    ? content.rewards
    : Array.isArray(content.coupons)
      ? content.coupons
      : [];
  const sharedRedemptions = Array.isArray(content.redemptions) ? content.redemptions : [];
  const normalizedSharedRedemptions = sharedRedemptions
    .map((item) => {
      const redemption = asRecord(item);
      const coupon = normalizeCoupon(redemption.coupon);
      return coupon ? normalizeRedemption(item, coupon) : null;
    })
    .filter(Boolean) as LoyaltyRedemption[];
  const rewards = rawRewards
    .map((rawReward): LoyaltyRewardProgress | null => {
      const reward = asRecord(rawReward);
      const coupon = normalizeCoupon(reward.coupon || reward);
      if (!coupon) return null;
      const rawRedemptions = Array.isArray(reward.redemptions)
        ? reward.redemptions
        : sharedRedemptions.filter((item) => finiteNumber(asRecord(item).couponId) === coupon.id);
      const redemptions = rawRedemptions
        .map((item) => normalizeRedemption(item, coupon))
        .filter(Boolean) as LoyaltyRedemption[];
      const purchasesRequired = Math.max(
        1,
        Math.trunc(
          finiteNumber(
            reward.purchasesRequired ??
              reward.loyaltyPurchasesRequired ??
              asRecord(reward.coupon).loyaltyPurchasesRequired,
            1,
          ),
        ),
      );
      const purchasesCompleted = Math.max(
        0,
        Math.trunc(finiteNumber(reward.purchasesCompleted ?? content.purchasesCompleted)),
      );
      const remaining = Math.max(
        0,
        Math.trunc(finiteNumber(reward.remaining, purchasesRequired - purchasesCompleted)),
      );
      return {
        coupon,
        purchasesRequired,
        purchasesCompleted,
        remaining,
        progressPercent: Math.max(
          0,
          Math.min(
            100,
            finiteNumber(
              reward.progressPercent,
              (Math.min(purchasesCompleted, purchasesRequired) / purchasesRequired) * 100,
            ),
          ),
        ),
        canRedeem: reward.canRedeem === true,
        limitReached: reward.limitReached === true,
        activeRedemptions: Math.max(0, Math.trunc(finiteNumber(reward.activeRedemptions))),
        walletLimit: Math.max(1, Math.trunc(finiteNumber(reward.walletLimit, 1))),
        nextCycle: Math.max(1, Math.trunc(finiteNumber(reward.nextCycle, 1))),
        redemptions,
      };
    })
    .filter(Boolean) as LoyaltyRewardProgress[];

  return {
    purchasesCompleted: Math.max(0, Math.trunc(finiteNumber(content.purchasesCompleted))),
    rewards,
    ...(Array.isArray(content.redemptions) ? { redemptions: normalizedSharedRedemptions } : {}),
  };
}

class LoyaltyService {
  async getSummary(restaurantId: number) {
    const response = await api.get('/coupons/loyalty', { params: { restaurantId } });
    return normalizeLoyaltySummary(response.data);
  }

  async redeem(couponId: number, restaurantId: number) {
    const response = await api.post(`/coupons/${couponId}/redeem`, { restaurantId });
    return response.data;
  }
}

export default new LoyaltyService();
