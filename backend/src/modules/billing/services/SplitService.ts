import billingRepository from '../repositories/BillingRepository.js';
import { PLAN_CONFIG } from '../config/planConfig.js';

type SplitPayload = {
  restaurantId: number;
  orderTotal: number;
};

class SplitService {
  async execute({ restaurantId, orderTotal }: SplitPayload) {
    const subscription = await billingRepository.findSubscriptionByRestaurantId(restaurantId);

    if (!subscription) {
      return 0;
    }

    const plan = PLAN_CONFIG[subscription.plan];

    if (!plan) {
      throw new Error('Plano inválido.');
    }

    return 0;
  }
}

export default new SplitService();
