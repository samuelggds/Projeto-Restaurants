import subscriptionRepository from "../repositories/SubscriptionRepository.js";

type GetSubscriptionPayload = {
  restaurantId: number | string;
};

class GetSubscriptionService {
  async execute({ restaurantId }: GetSubscriptionPayload) {
    const subscription =
      await subscriptionRepository.findByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error("Assinatura não encontrada!");
    }

    return subscription;
  }
}

export default new GetSubscriptionService();
