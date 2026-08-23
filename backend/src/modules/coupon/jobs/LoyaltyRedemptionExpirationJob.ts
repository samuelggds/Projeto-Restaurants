import couponRepository from '../repositories/CouponRepository.js';

class LoyaltyRedemptionExpirationJob {
  async execute(now = new Date()) {
    return couponRepository.expireClaimedRedemptions({ now });
  }
}

export default new LoyaltyRedemptionExpirationJob();
