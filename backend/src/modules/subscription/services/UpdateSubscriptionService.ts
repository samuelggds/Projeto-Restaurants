import type { PlanType, SubscriptionStatus } from "@prisma/client";
import subscriptionRepository from "../repositories/SubscriptionRepository.js";

type SubscriptionUpdatePayload = {
  restaurantId: number | string;
  plan?: PlanType;
  status?: SubscriptionStatus;
  trialEndsAt?: Date | null;
};

class UpdateSubscriptionService {
  async execute({
    restaurantId,
    plan,
    status,
    trialEndsAt,
  }: SubscriptionUpdatePayload) {
    const subscription =
      await subscriptionRepository.findByRestaurantId(restaurantId);

    if (!subscription) {
      throw new Error("Assinatura não encontrada!");
    }

    return await subscriptionRepository.update(restaurantId, {
      plan,
      status,
      trialEndsAt,
    });
  }
}

export default new UpdateSubscriptionService();
