import { Request, Response } from "express";
import createTableService from "../services/CreateTableService.js";

class CreateTableController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = req.user.restaurantId;

      const { number } = req.body;

      const table = await createTableService.execute({
        number,
        restaurantId,
      });

      return res.status(201).json(table);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Erro ao criar mesa",
      });
    }
  }
}

export default new CreateTableController();
