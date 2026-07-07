import { Request, Response } from "express";
import listProductRatingsService from "../services/ListProductRatingsService.js";

class ListProductRatingsController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.query.restaurantId);
      const clientKey = String(req.query.clientKey || "").trim();

      const result = await listProductRatingsService.execute(
        restaurantId,
        clientKey,
      );

      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Erro ao listar avaliacoes de produtos",
      });
    }
  }
}

export default new ListProductRatingsController();
