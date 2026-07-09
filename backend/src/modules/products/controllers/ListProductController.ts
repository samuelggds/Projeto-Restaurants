import { Request, Response } from "express";
import listProductService from "../services/ListProductService.js";

class ListProductsController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId =
        Number(req.query.restaurantId) || Number(req.user?.restaurantId);
      const slug =
        typeof req.query.slug === "string" ? req.query.slug : undefined;

      const products = await listProductService.execute({
        restaurantId,
        slug,
      });

      return res.status(200).json(products);
    } catch (error: unknown) {
      return res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao listar produtos",
      });
    }
  }
}

export default new ListProductsController();
