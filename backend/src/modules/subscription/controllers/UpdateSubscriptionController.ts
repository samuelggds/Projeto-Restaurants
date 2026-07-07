import { Request, Response } from "express";
import updateSubscriptionService from "../services/UpdateSubscriptionService.js";

class UpdateSubscriptionController {
  async handle(req: Request, res: Response) {
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
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar assinatura",
      });
    }
  }
}

export default new UpdateSubscriptionController();
