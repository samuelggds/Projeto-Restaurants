import updateSubscriptionService from "../services/UpdateSubscriptionService.js";
class UpdateSubscriptionController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { plan, status, trialEndsAt } = req.body;
            const subscription = await updateSubscriptionService.execute({
                restaurantId,
                plan,
                status,
                trialEndsAt,
            });
            return res.status(200).json(subscription);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao atualizar assinatura",
            });
        }
    }
}
export default new UpdateSubscriptionController();
