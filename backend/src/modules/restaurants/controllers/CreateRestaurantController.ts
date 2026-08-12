import { Request, Response } from "express";
import createRestaurantService from "../services/CreateRestaurantService.js";

class CreateRestaurantController {
  async handle(req: Request, res: Response) {
    try {
      const { restaurant, admin, plan } = req.body;

      const result = await createRestaurantService.execute({
        restaurant,
        admin,
        plan,
      });

      return res.status(201).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao criar restaurante",
      });
    }
  }
}

export default new CreateRestaurantController();
