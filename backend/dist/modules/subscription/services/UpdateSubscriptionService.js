import subscriptionRepository from "../repositories/SubscriptionRepository.js";
class UpdateSubscriptionService {
    async execute({ restaurantId, plan, status, trialEndsAt, }) {
        const subscription = await subscriptionRepository.findByRestaurantId(restaurantId);
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
