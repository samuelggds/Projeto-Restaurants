import type { LoyaltyRedemption, LoyaltyRewardProgress, LoyaltySummary } from '../../Home/types';

export type WalletEntryStatus = 'available' | 'reserved' | 'used' | 'expired';

export type LoyaltyWalletEntry = {
  id: number;
  cycle: number;
  restaurantName: string;
  code: string;
  title: string;
  description: string;
  discountLabel: string;
  minimumSubtotal: number;
  expiration: string | null;
  status: WalletEntryStatus;
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function discountLabel(coupon: LoyaltyRewardProgress['coupon']) {
  return coupon.discountType === 'PERCENTAGE'
    ? `${coupon.discount.toLocaleString('pt-BR')}% OFF`
    : `${money(coupon.discount)} OFF`;
}

function entryStatus(redemption: LoyaltyRedemption, now: number): WalletEntryStatus {
  if (redemption.status === 'USED') return 'used';
  if (redemption.status === 'RESERVED') return 'reserved';
  if (redemption.status === 'EXPIRED' || redemption.expired) return 'expired';
  const expirationSnapshot = redemption.expiresAt;
  const expirationValue = expirationSnapshot ?? redemption.coupon.expiration;
  const expiration = expirationValue ? Date.parse(expirationValue) : Number.POSITIVE_INFINITY;
  if (Number.isFinite(expiration) && expiration <= now) return 'expired';
  return 'available';
}

export function buildLoyaltyWalletEntries(
  summary: LoyaltySummary | null | undefined,
  restaurantName: string,
  now = Date.now(),
): LoyaltyWalletEntry[] {
  const seen = new Set<number>();

  const rewardEntries = (summary?.rewards || []).flatMap((reward) =>
    reward.redemptions.map((redemption) => ({ coupon: reward.coupon, redemption })),
  );
  const walletEntries = (summary?.redemptions || []).map((redemption) => ({
    coupon: redemption.coupon,
    redemption,
  }));

  return [...walletEntries, ...rewardEntries]
    .filter(({ redemption }) => {
      if (seen.has(redemption.id)) return false;
      seen.add(redemption.id);
      return true;
    })
    .map(({ coupon, redemption }) => ({
      id: redemption.id,
      cycle: redemption.cycle,
      restaurantName,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      discountLabel: discountLabel(coupon),
      minimumSubtotal: coupon.minimumSubtotal,
      expiration: redemption.expiresAt ?? coupon.expiration ?? null,
      status: entryStatus(redemption, now),
    }))
    .sort((left, right) => right.cycle - left.cycle || right.id - left.id);
}
