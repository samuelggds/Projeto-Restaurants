import { Request, Response } from "express";
import rateProductService from "../services/RateProductService.js";

class RateProductController {
  async handle(req: Request, res: Response) {
    try {
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { restaurantId, clientKey, rating } = req.body;

      const result = await rateProductService.execute({
        productId: id,
        restaurantId,
        clientKey,
        rating,
      });

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao avaliar produto",
      });
    }
  }
}

export default new RateProductController();
