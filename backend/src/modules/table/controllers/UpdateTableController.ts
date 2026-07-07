import { Request, Response } from "express";
import updateTableService from "../services/UpdateTableService.js";

class UpdateTableController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;
      const { number } = req.body;

      const table = await updateTableService.execute({
        id,
        restaurantId,
        number,
      });

      return res.status(200).json(table);
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error ? error.message : "Erro ao atualizar mesa",
      });
    }
  }
}

export default new UpdateTableController();
