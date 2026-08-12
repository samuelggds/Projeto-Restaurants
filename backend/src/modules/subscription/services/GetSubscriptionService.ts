import subscriptionRepository from "../repositories/SubscriptionRepository.js";
import billingRepository from "../../billing/repositories/BillingRepository.js";
import { evaluatePlanChangeEligibility } from "./PlanChangePolicy.js";

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

    const invoices = await billingRepository.findInvoicesByRestaurantId(
      Number(restaurantId),
    );
    const planChangeEligibility = evaluatePlanChangeEligibility({
      invoices,
      consumedInvoiceId: subscription.planChangeInvoiceId,
      hasScheduledPlan: Boolean(subscription.scheduledPlan),
    });

    return {
      ...subscription,
      planChangeEligibility,
    };
  }
}

export default new GetSubscriptionService();
