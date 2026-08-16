import type { PlanType, SubscriptionStatus } from '@prisma/client';
import subscriptionRepository from '../repositories/SubscriptionRepository.js';
import { isAvailablePlan } from '../../billing/config/planConfig.js';

type SubscriptionPayload = {
  restaurantId: number | string;
  plan: PlanType;
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
};

class CreateSubscriptionService {
  async execute({ restaurantId, plan, status, trialEndsAt }: SubscriptionPayload) {
    if (!isAvailablePlan(plan)) {
      throw new Error('Plano indisponível para contratação.');
    }

    const exists = await subscriptionRepository.findByRestaurantId(restaurantId);

    if (exists) {
      throw new Error('Assinatura já existe para esse restaurante!');
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
