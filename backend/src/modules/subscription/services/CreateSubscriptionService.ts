import type { PlanType, SubscriptionStatus } from "@prisma/client";
import subscriptionRepository from "../repositories/SubscriptionRepository.js";

type SubscriptionPayload = {
  restaurantId: number | string;
  plan: PlanType;
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
};

class CreateSubscriptionService {
  async execute({
    restaurantId,
    plan,
    status,
    trialEndsAt,
  }: SubscriptionPayload) {
    const exists =
      await subscriptionRepository.findByRestaurantId(restaurantId);

    if (exists) {
      throw new Error("Assinatura já existe para esse restaurante!");
    }

    return await subscriptionRepository.create({
      restaurantId: Number(restaurantId),
      plan,
      status,
      trialEndsAt,
    });
  }
}

export default new CreateSubscriptionService();
