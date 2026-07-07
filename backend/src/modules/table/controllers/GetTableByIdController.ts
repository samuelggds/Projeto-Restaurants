import { Request, Response } from "express";
import getTableByIdService from "../services/GetTableByIdService.js";

class GetTableByIdController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;

      const table = await getTableByIdService.execute({
        id,
        restaurantId,
      });

      return res.status(200).json(table);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao buscar mesa",
      });
    }
  }
}

export default new GetTableByIdController();
