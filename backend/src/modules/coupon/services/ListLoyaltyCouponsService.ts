import couponRepository from '../repositories/CouponRepository.js';
import { presentCoupon } from '../utils/couponPresenter.js';
import { calculateLoyaltyProgress } from '../utils/loyaltyProgress.js';

type ListLoyaltyCouponsPayload = {
  restaurantId: number;
  userId: number;
  now?: Date;
};

function isoDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function presentRedemption(
  redemption: any,
  coupon: ReturnType<typeof presentCoupon>,
  now: Date,
) {
  const expiresAt = redemption.expiresAt ? new Date(redemption.expiresAt) : null;
  const expired =
    redemption.status === 'EXPIRED' ||
    (redemption.status === 'CLAIMED' &&
      expiresAt !== null &&
      !Number.isNaN(expiresAt.getTime()) &&
      expiresAt <= now);
  return {
    id: redemption.id,
    restaurantId: redemption.restaurantId ?? coupon.restaurantId,
    couponId: redemption.couponId ?? coupon.id,
    status: redemption.status,
    cycle: redemption.cycle,
    orderId: redemption.order?.id ?? null,
    claimedAt: isoDate(redemption.claimedAt),
    reservedAt: isoDate(redemption.reservedAt),
    usedAt: isoDate(redemption.usedAt),
    expiresAt: isoDate(expiresAt),
    expired,
    createdAt: isoDate(redemption.createdAt),
    updatedAt: isoDate(redemption.updatedAt),
    coupon,
  };
}

export function getLatestLoyaltyCycleStartedAt(redemptionRecords: any[]) {
  return redemptionRecords.reduce<Date | null>((latest, redemption) => {
    const value = redemption?.claimedAt || redemption?.createdAt;
    if (!value) return latest;
    const candidate = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(candidate.getTime())) return latest;
    return !latest || candidate > latest ? candidate : latest;
  }, null);
}

export function buildLoyaltyReward(
  couponRecord: any,
  purchasesCompleted: number,
  redemptionRecords: any[],
  now = new Date(),
) {
  const coupon = presentCoupon(couponRecord);
  const redemptions = redemptionRecords
    .filter((redemption) => Number(redemption.couponId) === Number(coupon.id))
    .map((redemption) => presentRedemption(redemption, coupon, now));
  const progress = calculateLoyaltyProgress({
    purchasesCompleted,
    purchasesRequired: coupon.loyaltyPurchasesRequired,
    perCustomerLimit: coupon.perCustomerLimit,
    redemptions,
    now,
  });

  return {
    coupon,
    purchasesCompleted,
    purchasesRequired: coupon.loyaltyPurchasesRequired,
    remaining: progress.remaining,
    progressPercent: progress.progressPercent,
    canRedeem: progress.canRedeem,
    nextCycle: progress.nextCycle,
    redeemableCycle: progress.redeemableCycle,
    limitReached: progress.limitReached,
    activeRedemptions: progress.activeRedemptions,
    walletLimit: progress.walletLimit,
    redemptions,
  };
}

export class ListLoyaltyCouponsService {
  async execute({ restaurantId, userId, now = new Date() }: ListLoyaltyCouponsPayload) {
    const [coupons, purchasesCompleted] = await Promise.all([
      couponRepository.findActiveLoyaltyByRestaurant(restaurantId, now),
      couponRepository.countCompletedPurchases(userId, restaurantId),
    ]);
    await couponRepository.expireClaimedRedemptions({
      restaurantId,
      userId,
      now,
    });
    const redemptions = await couponRepository.findAllRedemptions(userId, restaurantId);

    const rewards = await Promise.all(
      coupons.map(async (coupon) => {
        const couponRedemptions = redemptions.filter(
          (redemption) => Number(redemption.couponId) === Number(coupon.id),
        );
        const cycleStartedAt = getLatestLoyaltyCycleStartedAt(couponRedemptions);
        const purchasesInCurrentCycle = cycleStartedAt
          ? await couponRepository.countCompletedPurchases(userId, restaurantId, cycleStartedAt)
          : purchasesCompleted;

        return buildLoyaltyReward(coupon, purchasesInCurrentCycle, couponRedemptions, now);
      }),
    );

    return {
      restaurantId,
      purchasesCompleted,
      rewards,
      redemptions: redemptions.map((redemption) =>
        presentRedemption(redemption, presentCoupon(redemption.coupon), now),
      ),
    };
  }
}

export default new ListLoyaltyCouponsService();
