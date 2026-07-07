import { Request, Response } from "express";
import listOrdersService from "../services/ListOrdersService.js";

class ListOrdersController {
  async handle(req: Request, res: Response) {
    try {
      const { status } = req.query;

      const restaurantId = req.user.restaurantId;

      const orders = await listOrdersService.execute(restaurantId, status);

      return res.json(orders);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao listar pedidos",
      });
    }
  }
}

export default new ListOrdersController();
