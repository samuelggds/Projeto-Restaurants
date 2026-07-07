import { Request, Response } from "express";
import deactivateTableService from "../services/DeactivateTableService.js";

class DeactivateTableController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;

      const table = await deactivateTableService.execute({
        id,
        restaurantId,
      });

      return res.status(200).json(table);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao desativar mesa",
      });
    }
  }
}

export default new DeactivateTableController();
