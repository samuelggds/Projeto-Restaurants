import createSubscriptionService from "../services/CreateSubscriptionService.js";

class CreateSubscriptionController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { plan, status, trialEndsAt } = req.body;

      const subscription = await createSubscriptionService.execute({
        restaurantId,
        plan,
        status,
        trialEndsAt,
      });

      return res.status(201).json(subscription);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new CreateSubscriptionController();
