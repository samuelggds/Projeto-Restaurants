export type LoyaltyRedemptionLike = {
  cycle: number;
  status: 'CLAIMED' | 'RESERVED' | 'USED' | 'EXPIRED' | string;
  expiresAt?: Date | string | null;
};

export type LoyaltyProgressInput = {
  purchasesCompleted: number;
  purchasesRequired: number;
  perCustomerLimit: number;
  redemptions: LoyaltyRedemptionLike[];
  now?: Date;
};

export function calculateLoyaltyProgress({
  purchasesCompleted,
  purchasesRequired,
  perCustomerLimit,
  redemptions,
  now = new Date(),
}: LoyaltyProgressInput) {
  const completed = Math.max(0, Math.trunc(purchasesCompleted));
  const required = Math.max(1, Math.trunc(purchasesRequired));
  const limit = Math.max(1, Math.trunc(perCustomerLimit));
  const cycles = redemptions
    .map((redemption) => Math.trunc(Number(redemption.cycle)))
    .filter((cycle) => cycle > 0);
  const earnedCycles = Math.floor(completed / required);
  const activeRedemptions = redemptions.filter((redemption) => {
    if (redemption.status === 'RESERVED') return true;
    if (redemption.status !== 'CLAIMED') return false;
    if (!redemption.expiresAt) return true;
    const expiresAt = new Date(redemption.expiresAt);
    return Number.isNaN(expiresAt.getTime()) || expiresAt > now;
  }).length;
  const limitReached = activeRedemptions >= limit;
  const nextCycle = (cycles.length > 0 ? Math.max(...cycles) : 0) + 1;
  const redeemableCycle = !limitReached && earnedCycles >= 1 ? nextCycle : null;
  const progressPercent = Math.min(100, Math.round((completed / required) * 100));

  return {
    earnedCycles,
    nextCycle,
    redeemableCycle,
    canRedeem: redeemableCycle !== null && !limitReached,
    limitReached,
    activeRedemptions,
    walletLimit: limit,
    remaining: Math.max(0, required - completed),
    progressPercent,
  };
}
