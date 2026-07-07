import billingRepository from "../repositories/BillingRepository.js";
import { PLAN_CONFIG } from "../config/planConfig.js";

class SplitService {
  async execute({ restaurantId, orderTotal }) {
    const subscription =
      await billingRepository.findSubscriptionByRestaurantId(restaurantId);

    if (!subscription) {
      return 0;
    }

    const plan = PLAN_CONFIG[subscription.plan];

    if (!plan) {
      throw new Error("Plano inválido.");
    }

    const systemFee = Number((orderTotal * plan.splitRate).toFixed(2));

    return systemFee;
  }
}

export default new SplitService();
