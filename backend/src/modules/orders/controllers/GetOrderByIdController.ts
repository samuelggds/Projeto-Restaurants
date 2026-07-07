import { Request, Response } from "express";
import getOrderByIdService from "../services/GetOrderByIdService.js";

class GetOrderByIdController {
  async handle(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const restaurantId = req.user.restaurantId;

      const order = await getOrderByIdService.execute(id, restaurantId);

      return res.json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao buscar pedido",
      });
    }
  }
}

export default new GetOrderByIdController();
