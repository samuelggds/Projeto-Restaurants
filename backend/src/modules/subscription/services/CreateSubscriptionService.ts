import subscriptionRepository from "../repositories/SubscriptionRepository.js";

class CreateSubscriptionService {
  async execute({ restaurantId, plan, status, trialEndsAt }) {
    const exists =
      await subscriptionRepository.findByRestaurantId(restaurantId);

    if (exists) {
      throw new Error("Assinatura já existe para esse restaurante!");
    }

    return await subscriptionRepository.create({
      restaurantId,
      plan,
      status,
      trialEndsAt,
    });
  }
}

export default new CreateSubscriptionService();
