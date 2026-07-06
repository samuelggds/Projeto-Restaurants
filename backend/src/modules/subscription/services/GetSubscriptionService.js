import subscriptionRepository from "../repositories/SubscriptionRepository.js";

class GetSubscriptionService {
  async execute({ restaurantId }) {
    const subscription =
      await subscriptionRepository.findByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error("Assinatura não encontrada!");
    }

    return subscription;
  }
}

export default new GetSubscriptionService();
