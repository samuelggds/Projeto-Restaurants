import { Request, Response } from "express";
import getSubscriptionService from "../services/GetSubscriptionService.js";

class GetSubscriptionController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const subscription = await getSubscriptionService.execute({
        restaurantId,
      });

      return res.status(200).json(subscription);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao buscar assinatura",
      });
    }
  }
}

export default new GetSubscriptionController();
