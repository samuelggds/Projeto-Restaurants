import couponRepository from '../repositories/CouponRepository.js';
import {
  buildLoyaltyReward,
  getLatestLoyaltyCycleStartedAt,
} from './ListLoyaltyCouponsService.js';

type RedeemLoyaltyCouponPayload = {
  couponId: number;
  restaurantId: number;
  userId: number;
  now?: Date;
};

export function calculateRedemptionExpiresAt(coupon: any, claimedAt: Date) {
  const validityDays = Math.min(
    365,
    Math.max(1, Math.trunc(Number(coupon.redemptionValidityDays || 30))),
  );
  const validityDeadline = new Date(claimedAt.getTime() + validityDays * 24 * 60 * 60 * 1000);
  if (!coupon.expiration) return validityDeadline;
  const campaignDeadline = new Date(coupon.expiration);
  if (Number.isNaN(campaignDeadline.getTime())) return validityDeadline;
  return campaignDeadline < validityDeadline ? campaignDeadline : validityDeadline;
}

export class RedeemLoyaltyCouponService {
  async execute({ couponId, restaurantId, userId, now = new Date() }: RedeemLoyaltyCouponPayload) {
    const coupon = await couponRepository.findActiveById(couponId, restaurantId, now);

    if (!coupon) {
      throw new Error('Cupom indisponível ou expirado.');
    }

    await couponRepository.expireClaimedRedemptions({
      restaurantId: coupon.restaurantId,
      userId,
      couponIds: [coupon.id],
      now,
    });
    const redemptions = await couponRepository.findRedemptions(
      userId,
      coupon.restaurantId,
      [coupon.id],
    );
    const cycleStartedAt = getLatestLoyaltyCycleStartedAt(redemptions);
    const purchasesCompleted = await couponRepository.countCompletedPurchases(
      userId,
      coupon.restaurantId,
      cycleStartedAt,
    );
    const reward = buildLoyaltyReward(coupon, purchasesCompleted, redemptions, now);

    if (reward.limitReached) {
      throw new Error(
        'Você já atingiu o limite de resgates simultâneos deste benefício. Use o cupom guardado antes de resgatar outro.',
      );
    }

    if (!reward.canRedeem || reward.redeemableCycle === null) {
      const remaining = Math.max(1, reward.remaining);
      throw new Error(
        `${remaining === 1 ? 'Falta' : 'Faltam'} ${remaining} ${remaining === 1 ? 'compra concluída' : 'compras concluídas'} para liberar este cupom.`,
      );
    }

    try {
      const expiresAt = calculateRedemptionExpiresAt(coupon, now);
      const redemption = await couponRepository.createRedemption({
        restaurantId: coupon.restaurantId,
        couponId: coupon.id,
        userId,
        cycle: reward.redeemableCycle,
        status: 'CLAIMED',
        claimedAt: now,
        expiresAt,
      });
      const updatedReward = buildLoyaltyReward(coupon, 0, [
        ...redemptions,
        redemption,
      ], now);

      return {
        message: `Cupom ${coupon.code.toUpperCase()} resgatado. Use o código no seu próximo pedido.`,
        redemption: updatedReward.redemptions.find((item) => item.id === redemption.id),
        reward: updatedReward,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new Error('Este ciclo de fidelidade já foi resgatado.');
      }
      throw error;
    }
  }
}

export default new RedeemLoyaltyCouponService();
