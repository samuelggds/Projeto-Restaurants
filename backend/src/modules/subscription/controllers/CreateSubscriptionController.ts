import { Request, Response } from "express";
import createSubscriptionService from "../services/CreateSubscriptionService.js";

class CreateSubscriptionController {
  async handle(req: Request, res: Response) {
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
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao criar assinatura",
      });
    }
  }
}

export default new CreateSubscriptionController();
